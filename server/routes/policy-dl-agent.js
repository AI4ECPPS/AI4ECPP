import express from 'express'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to Python main script
const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'policy_dl_agent', 'main.py')

/**
 * Execute Python script for deep learning operations
 * @param {Object} inputData - Input data for the Python script
 * @param {number} timeout - Timeout in milliseconds (default: 10 minutes for training)
 */
const runPythonDL = (inputData, timeout = 600000) => {
  return new Promise((resolve, reject) => {
    const pythonCommands = ['python3', 'python']
    
    const tryPython = (index) => {
      if (index >= pythonCommands.length) {
        reject(new Error('Python is not installed or not in PATH. Please install Python 3 with torch, numpy, and pandas.'))
        return
      }
      
      const pythonCmd = pythonCommands[index]
      const python = spawn(pythonCmd, [PYTHON_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(PYTHON_SCRIPT)
      })
      
      let stdout = ''
      let stderr = ''
      
      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      python.stderr.on('data', (data) => {
        stderr += data.toString()
        // Log progress updates
        if (data.toString().includes('Epoch')) {
          console.log('[Policy DL Agent]', data.toString().trim())
        }
      })
      
      python.on('error', (error) => {
        tryPython(index + 1)
      })
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout)
            resolve(result)
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${stdout.substring(0, 500)}`))
          }
        } else {
          if (stderr.includes('No module named')) {
            const moduleMatch = stderr.match(/No module named '(\w+)'/)
            const missingModule = moduleMatch ? moduleMatch[1] : 'unknown'
            reject(new Error(`Missing Python package: ${missingModule}. Please run: pip install torch numpy pandas scikit-learn scipy matplotlib seaborn`))
          } else if (code === null) {
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
      const timeoutHandle = setTimeout(() => {
        python.kill()
        reject(new Error('Operation timed out. For large datasets or complex models, training may take longer.'))
      }, timeout)
      
      python.on('close', () => {
        clearTimeout(timeoutHandle)
      })
    }
    
    tryPython(0)
  })
}

/**
 * POST /api/policy-dl-agent/train
 * Train a new Transformer model on panel data
 */
router.post('/train', async (req, res) => {
  try {
    const {
      data,
      dataType = 'panel',  // 'panel' or 'cross_section'
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      // Model parameters
      dModel = 128,
      numHeads = 8,
      numLayers = 4,
      dFf = 512,
      dropout = 0.1,
      // Training parameters
      learningRate = 0.0001,
      batchSize = 32,
      epochs = 100,
      lookback = 5,
      predHorizon = 1
    } = req.body
    
    // Validate required fields
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
        message: 'Please upload a CSV file with your data.'
      })
    }
    
    // For panel data, require entity and time columns
    if (dataType === 'panel' && (!entityCol || !timeCol)) {
      return res.status(400).json({
        success: false,
        error: 'Missing configuration',
        message: 'Please specify entity and time columns for panel data.'
      })
    }
    
    if (!featureCols || featureCols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No features selected',
        message: 'Please select at least one feature variable.'
      })
    }
    
    if (!targetCols || targetCols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No targets selected',
        message: 'Please select at least one target variable to predict.'
      })
    }
    
    console.log(`[Policy DL Agent] Starting training (${dataType}) with ${featureCols.length} features, ${targetCols.length} targets`)
    console.log(`[Policy DL Agent] Model config: d_model=${dModel}, heads=${numHeads}, layers=${numLayers}`)
    
    const inputData = {
      action: 'train',
      data,
      dataType,
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      dModel,
      numHeads,
      numLayers,
      dFf,
      dropout,
      learningRate,
      batchSize,
      epochs,
      lookback: dataType === 'panel' ? lookback : 1,
      predHorizon: dataType === 'panel' ? predHorizon : 1
    }
    
    // Training may take a while - 10 minute timeout
    const result = await runPythonDL(inputData, 600000)
    
    if (!result.success) {
      return res.status(400).json(result)
    }
    
    console.log(`[Policy DL Agent] Training completed. Best val loss: ${result.bestValLoss}`)
    
    res.json(result)
    
  } catch (error) {
    console.error('[Policy DL Agent] Training error:', error)
    res.status(500).json({
      success: false,
      error: 'Training failed',
      message: error.message
    })
  }
})

/**
 * POST /api/policy-dl-agent/optimize
 * Optimize policy parameters using a trained model and custom reward function
 */
router.post('/optimize', async (req, res) => {
  try {
    const {
      modelState,
      rewardCode,
      data,
      dataType = 'panel',
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      policyFeatures,
      bounds,
      optimizationMethod = 'differential_evolution',
      maxIterations = 100
    } = req.body
    
    if (!modelState) {
      return res.status(400).json({
        success: false,
        error: 'No model',
        message: 'Please train a model first before running optimization.'
      })
    }
    
    if (!rewardCode) {
      return res.status(400).json({
        success: false,
        error: 'No reward function',
        message: 'Please provide a reward function.'
      })
    }
    
    if (!policyFeatures || policyFeatures.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No policy features',
        message: 'Please select which features represent policy parameters to optimize.'
      })
    }
    
    console.log(`[Policy DL Agent] Starting optimization for ${policyFeatures.length} policy parameters`)
    
    const inputData = {
      action: 'optimize',
      modelState,
      rewardCode,
      data,
      dataType,
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      policyFeatures,
      bounds,
      optimizationMethod,
      maxIterations
    }
    
    // Optimization timeout: 5 minutes
    const result = await runPythonDL(inputData, 300000)
    
    if (!result.success) {
      return res.status(400).json(result)
    }
    
    console.log(`[Policy DL Agent] Optimization completed. Optimal reward: ${result.optimalReward}`)
    
    res.json(result)
    
  } catch (error) {
    console.error('[Policy DL Agent] Optimization error:', error)
    res.status(500).json({
      success: false,
      error: 'Optimization failed',
      message: error.message
    })
  }
})

/**
 * POST /api/policy-dl-agent/predict
 * Make predictions using a trained model
 */
router.post('/predict', async (req, res) => {
  try {
    const {
      modelState,
      data,
      dataType = 'panel',
      entityCol,
      timeCol,
      featureCols,
      targetCols
    } = req.body
    
    if (!modelState) {
      return res.status(400).json({
        success: false,
        error: 'No model',
        message: 'Please train a model first.'
      })
    }
    
    const inputData = {
      action: 'predict',
      modelState,
      data,
      dataType,
      entityCol,
      timeCol,
      featureCols,
      targetCols
    }
    
    const result = await runPythonDL(inputData, 60000)
    
    res.json(result)
    
  } catch (error) {
    console.error('[Policy DL Agent] Prediction error:', error)
    res.status(500).json({
      success: false,
      error: 'Prediction failed',
      message: error.message
    })
  }
})

/**
 * POST /api/policy-dl-agent/scenario
 * Analyze multiple policy scenarios
 */
router.post('/scenario', async (req, res) => {
  try {
    const {
      modelState,
      rewardCode,
      data,
      dataType = 'panel',
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      scenarios
    } = req.body
    
    if (!modelState) {
      return res.status(400).json({
        success: false,
        error: 'No model',
        message: 'Please train a model first.'
      })
    }
    
    if (!scenarios || Object.keys(scenarios).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No scenarios',
        message: 'Please define at least one policy scenario to analyze.'
      })
    }
    
    console.log(`[Policy DL Agent] Analyzing ${Object.keys(scenarios).length} scenarios`)
    
    const inputData = {
      action: 'scenario',
      modelState,
      rewardCode,
      data,
      dataType,
      entityCol,
      timeCol,
      featureCols,
      targetCols,
      scenarios
    }
    
    const result = await runPythonDL(inputData, 120000)
    
    res.json(result)
    
  } catch (error) {
    console.error('[Policy DL Agent] Scenario analysis error:', error)
    res.status(500).json({
      success: false,
      error: 'Scenario analysis failed',
      message: error.message
    })
  }
})

/**
 * GET /api/policy-dl-agent/health
 * Check if Python environment is set up correctly
 */
router.get('/health', async (req, res) => {
  try {
    // Quick health check
    const inputData = {
      action: 'train',
      data: 'entity,time,x1,x2,y\nA,1,1,2,3\nA,2,2,3,4\nA,3,3,4,5\nA,4,4,5,6\nA,5,5,6,7\nA,6,6,7,8\nA,7,7,8,9\nB,1,1,2,3\nB,2,2,3,4\nB,3,3,4,5\nB,4,4,5,6\nB,5,5,6,7\nB,6,6,7,8\nB,7,7,8,9',
      entityCol: 'entity',
      timeCol: 'time',
      featureCols: ['x1', 'x2'],
      targetCols: ['y'],
      epochs: 2,
      lookback: 3,
      predHorizon: 1
    }
    
    await runPythonDL(inputData, 30000)
    
    res.json({
      status: 'ok',
      message: 'Policy DL Agent is ready',
      pythonReady: true,
      torchReady: true
    })
    
  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      pythonReady: false,
      installInstructions: {
        mac: 'pip3 install torch numpy pandas scikit-learn scipy matplotlib seaborn',
        windows: 'pip install torch numpy pandas scikit-learn scipy matplotlib seaborn',
        linux: 'pip3 install torch numpy pandas scikit-learn scipy matplotlib seaborn'
      }
    })
  }
})

export default router
