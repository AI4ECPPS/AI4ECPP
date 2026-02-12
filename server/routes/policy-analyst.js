import express from 'express'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to Python script (new unified script)
const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'empirical_analysis.py')

/**
 * Execute Python script for regression analysis
 */
const runPythonAnalysis = (inputData) => {
  return new Promise((resolve, reject) => {
    // Try different Python commands
    const pythonCommands = ['/usr/bin/python3', 'python3', 'python']
    
    const tryPython = (index) => {
      if (index >= pythonCommands.length) {
        reject(new Error('Python is not installed or not in PATH. Please install Python 3 with pandas, statsmodels, matplotlib, and seaborn.'))
        return
      }
      
      const pythonCmd = pythonCommands[index]
      const python = spawn(pythonCmd, [PYTHON_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let stdout = ''
      let stderr = ''
      
      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      python.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      python.on('error', (error) => {
        // Try next Python command
        tryPython(index + 1)
      })
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout)
            resolve(result)
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${stdout}`))
          }
        } else {
          // Check if it's a Python not found error
          if (stderr.includes('No module named')) {
            reject(new Error(`Missing Python package. ${stderr}`))
          } else if (code === null) {
            // Process was killed, try next
            tryPython(index + 1)
          } else {
            reject(new Error(`Python script error (code ${code}): ${stderr || stdout}`))
          }
        }
      })
      
      // Send input data to Python
      python.stdin.write(JSON.stringify(inputData))
      python.stdin.end()
      
      // Set timeout
      setTimeout(() => {
        python.kill()
      }, 60000) // 60 second timeout
    }
    
    tryPython(0)
  })
}

/**
 * POST /api/policy-analyst/analyze
 * Perform various statistical analyses on uploaded data
 */
router.post('/analyze', async (req, res) => {
  try {
    const { 
      data, 
      fileName, 
      analysisType = 'regression',
      dependentVar, 
      independentVars, 
      selectedVars,
      groupVar,
      testVar,
      testType,
      language, 
      additionalRequest 
    } = req.body
    
    // Validate required fields
    if (!data) {
      return res.status(400).json({
        error: 'No data provided',
        message: 'Please upload a CSV file with your data.'
      })
    }
    
    // Validate based on analysis type
    const validAnalysisTypes = ['descriptive', 'regression', 'fixed_effects', 'logit', 'probit', 'iv', 'did', 'timeseries', 'adf_test', 'acf_pacf', 'arima', 'var', 'vecm']
    const selectedAnalysisType = validAnalysisTypes.includes(analysisType) ? analysisType : 'regression'
    
    // Type-specific validation
    if (selectedAnalysisType === 'regression') {
      if (!dependentVar) {
        return res.status(400).json({
          error: 'No dependent variable',
          message: 'Please select a dependent variable (Y).'
        })
      }
      if (!independentVars || independentVars.length === 0) {
        return res.status(400).json({
          error: 'No independent variables',
          message: 'Please select at least one independent variable (X).'
        })
      }
    } else if (selectedAnalysisType === 'iv') {
      const { endogenousVar, instrumentVars } = req.body
      if (!dependentVar || !endogenousVar || !instrumentVars || instrumentVars.length === 0) {
        return res.status(400).json({
          error: 'Missing IV variables',
          message: 'Please select dependent variable, endogenous variable, and at least one instrument.'
        })
      }
    } else if (selectedAnalysisType === 'did') {
      const { outcomeVar, treatmentVar, timeVar } = req.body
      if (!outcomeVar || !treatmentVar || !timeVar) {
        return res.status(400).json({
          error: 'Missing DID variables',
          message: 'Please select outcome, treatment, and time variables.'
        })
      }
    } else if (selectedAnalysisType === 'fixed_effects') {
      if (!dependentVar || !independentVars || independentVars.length === 0) {
        return res.status(400).json({
          error: 'Missing fixed effects variables',
          message: 'Please select dependent variable and at least one independent variable. Use "Use row index" if your CSV has no ID column.'
        })
      }
    } else if (selectedAnalysisType === 'timeseries') {
      const { timeSeriesVar } = req.body
      if (!timeSeriesVar) {
        return res.status(400).json({
          error: 'Missing time series variable',
          message: 'Please select a time series variable.'
        })
      }
    }
    
    // Validate language
    const validLanguages = ['Python', 'R']
    const selectedLanguage = validLanguages.includes(language) ? language : 'Python'
    
    console.log(`[Policy Analyst] Running ${selectedAnalysisType} analysis in ${selectedLanguage}`)
    
    // Get additional parameters from request body
    const { 
      endogenousVar, 
      instrumentVars, 
      exogenousVars,
      outcomeVar, 
      treatmentVar, 
      timeVar, 
      controlVars,
      timeSeriesVar,
      dateVar,
      entityVar,
      timeFeVar,
      feType,
      arimaP, arimaD, arimaQ,
      varVariables, varLags, vecmRank
    } = req.body

    // Prepare input for Python script
    const inputData = {
      data,
      analysisType: selectedAnalysisType,
      dependentVar,
      independentVars,
      selectedVars,
      // IV specific
      endogenousVar,
      instrumentVars,
      exogenousVars,
      // DID specific
      outcomeVar,
      treatmentVar,
      timeVar,
      controlVars,
      // Fixed effects
      entityVar,
      timeFeVar,
      feType,
      // Time series specific
      timeSeriesVar,
      dateVar,
      arimaP, arimaD, arimaQ,
      varVariables, varLags, vecmRank,
      // General
      language: selectedLanguage,
      additionalRequest: additionalRequest || ''
    }
    
    // Run Python analysis
    const result = await runPythonAnalysis(inputData)
    
    // Check for errors from Python
    if (result.error) {
      return res.status(400).json({
        error: 'Analysis failed',
        message: result.error,
        availableColumns: result.available_columns
      })
    }
    
    // Return successful result
    res.json({
      results: result.results,
      code: result.code,
      plots: result.plots,
      interpretation: result.interpretation,
      analysisType: result.analysisType || selectedAnalysisType
    })
    
  } catch (error) {
    console.error('[Policy Analyst] Error:', error)
    
    // Provide helpful error messages
    if (error.message.includes('Python is not installed')) {
      return res.status(500).json({
        error: 'Python not found',
        message: 'Python 3 is required for analysis. Please install Python and the required packages (pandas, statsmodels, scipy, matplotlib, seaborn).',
        installInstructions: {
          mac: 'brew install python3 && pip3 install pandas statsmodels scipy matplotlib seaborn',
          windows: 'Download Python from python.org and run: pip install pandas statsmodels scipy matplotlib seaborn',
          linux: 'sudo apt install python3 python3-pip && pip3 install pandas statsmodels scipy matplotlib seaborn'
        }
      })
    }
    
    if (error.message.includes('No module named')) {
      const missingModule = error.message.match(/No module named '(\w+)'/)?.[1] || 'unknown'
      return res.status(500).json({
        error: 'Missing Python package',
        message: `The Python package '${missingModule}' is not installed. Please run: pip install ${missingModule}`,
        installCommand: `pip install pandas statsmodels scipy matplotlib seaborn`
      })
    }
    
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message || 'An unexpected error occurred during analysis.'
    })
  }
})

/**
 * POST /api/policy-analyst/transform
 * Transform data (create variables, filter, etc.) for pipeline mode
 */
router.post('/transform', async (req, res) => {
  try {
    const { data, transformType, config, language } = req.body
    
    if (!data) {
      return res.status(400).json({
        error: 'No data provided',
        message: 'Please provide data to transform.'
      })
    }
    
    if (!transformType) {
      return res.status(400).json({
        error: 'No transform type',
        message: 'Please specify a transformation type.'
      })
    }
    
    const validTransforms = ['log_transform', 'create_variable', 'standardize', 'lag_variable', 'filter_data', 'drop_missing']
    if (!validTransforms.includes(transformType)) {
      return res.status(400).json({
        error: 'Invalid transform type',
        message: `Transform type must be one of: ${validTransforms.join(', ')}`
      })
    }
    
    console.log(`[Policy Analyst] Running ${transformType} transform`)
    
    const inputData = {
      data,
      analysisType: 'transform',
      transformType,
      config: config || {},
      language: language || 'Python'
    }
    
    const result = await runPythonAnalysis(inputData)
    
    if (result.error) {
      return res.status(400).json({
        error: 'Transform failed',
        message: result.error
      })
    }
    
    res.json({
      transformedData: result.transformedData,
      columns: result.columns,
      code: result.code,
      description: result.description,
      rowsAffected: result.rowsAffected
    })
    
  } catch (error) {
    console.error('[Policy Analyst] Transform error:', error)
    res.status(500).json({
      error: 'Transform failed',
      message: error.message || 'An unexpected error occurred during transformation.'
    })
  }
})

/**
 * GET /api/policy-analyst/health
 * Check if Python environment is set up correctly
 */
router.get('/health', async (req, res) => {
  try {
    // Test Python availability
    const testInput = {
      data: 'x,y\n1,2\n2,4\n3,6',
      dependentVar: 'y',
      independentVars: ['x'],
      language: 'Python'
    }
    
    await runPythonAnalysis(testInput)
    
    res.json({
      status: 'ok',
      message: 'Python environment is configured correctly',
      pythonReady: true
    })
  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      pythonReady: false,
      installInstructions: {
        mac: 'brew install python3 && pip3 install pandas statsmodels matplotlib seaborn',
        windows: 'Download Python from python.org and run: pip install pandas statsmodels matplotlib seaborn',
        linux: 'sudo apt install python3 python3-pip && pip3 install pandas statsmodels matplotlib seaborn'
      }
    })
  }
})

export default router
