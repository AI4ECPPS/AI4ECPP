import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import api, { callChatGPT } from '../utils/api'

function PolicyAnalyst() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const nlTextareaRef = useRef(null)
  
  // Mode: 'oneStep' or 'pipeline'
  const [mode, setMode] = useState('oneStep')
  
  // Data upload states
  const [dataFile, setDataFile] = useState(null)
  const [dataPreview, setDataPreview] = useState(null)
  const [columns, setColumns] = useState([])
  const [rawData, setRawData] = useState('') // Store raw CSV for pipeline
  
  // ========== ONE-STEP MODE STATES ==========
  const [oneStepInputMode, setOneStepInputMode] = useState('form') // 'form' or 'nl' (natural language)
  const [analysisType, setAnalysisType] = useState('descriptive')
  const [analysisRequest, setAnalysisRequest] = useState('')
  const [language, setLanguage] = useState('Python')
  
  // Natural Language mode states
  const [nlDescription, setNlDescription] = useState('')
  const [nlSuggestions, setNlSuggestions] = useState([])
  const [nlSelectedIndex, setNlSelectedIndex] = useState(0)
  const [nlCursorPos, setNlCursorPos] = useState(0)
  const [nlShowSuggestions, setNlShowSuggestions] = useState(false)
  const [nlExplanation, setNlExplanation] = useState('')
  
  // Variable selections
  const [dependentVar, setDependentVar] = useState('')
  const [independentVars, setIndependentVars] = useState([])
  const [selectedVars, setSelectedVars] = useState([])
  const [instrumentVars, setInstrumentVars] = useState([])
  const [endogenousVar, setEndogenousVar] = useState('')
  const [treatmentVar, setTreatmentVar] = useState('')
  const [timeVar, setTimeVar] = useState('')
  const [didOutcomeVar, setDidOutcomeVar] = useState('')
  const [timeSeriesVar, setTimeSeriesVar] = useState('')
  const [dateVar, setDateVar] = useState('')
  // Fixed Effects
  const [entityVar, setEntityVar] = useState('')
  const [timeFeVar, setTimeFeVar] = useState('')
  const [feType, setFeType] = useState('entity') // 'entity', 'time', 'twoway'
  // ARIMA parameters
  const [arimaP, setArimaP] = useState(1)
  const [arimaD, setArimaD] = useState(1)
  const [arimaQ, setArimaQ] = useState(1)
  // VAR/VECM
  const [varVariables, setVarVariables] = useState([])
  const [varLags, setVarLags] = useState(1)
  const [vecmRank, setVecmRank] = useState(1)
  
  // Results states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [generatedCode, setGeneratedCode] = useState('')
  const [plots, setPlots] = useState([])
  const [interpretation, setInterpretation] = useState('')
  const [plotModal, setPlotModal] = useState(null) // { image, title } for zoom modal

  // ========== PIPELINE MODE STATES ==========
  const [pipelineSteps, setPipelineSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [pipelineData, setPipelineData] = useState('') // Current transformed data
  const [pipelineColumns, setPipelineColumns] = useState([])
  const [showAddStep, setShowAddStep] = useState(false)
  const [newStepType, setNewStepType] = useState('')
  const [newStepConfig, setNewStepConfig] = useState({})

  // ========== ROBUSTNESS MODE STATES ==========
  const [robustInputMode, setRobustInputMode] = useState('code') // 'code' or 'manual'
  const [robustOriginalCode, setRobustOriginalCode] = useState('')
  const [robustCodeFile, setRobustCodeFile] = useState(null)
  const robustCodeFileRef = useRef(null)
  const [robustDepVar, setRobustDepVar] = useState('')
  const [robustIndepVars, setRobustIndepVars] = useState('')
  const [robustControlVars, setRobustControlVars] = useState('')
  const [robustFixedEffects, setRobustFixedEffects] = useState('')
  const [robustClusterVar, setRobustClusterVar] = useState('')
  const [robustMethod, setRobustMethod] = useState('ols')
  const [robustDataDesc, setRobustDataDesc] = useState('')
  const [robustResult, setRobustResult] = useState(null)
  const [robustActiveTab, setRobustActiveTab] = useState('suggestions')
  const [robustCodeLang, setRobustCodeLang] = useState('stata')

  // Reset data when switching modes
  useEffect(() => {
    // Clear file and data when switching modes
    setDataFile(null)
    setColumns([])
    setDataPreview(null)
    setRawData('')
    setPipelineData('')
    setPipelineColumns([])
    setPipelineSteps([])
    setCurrentStepIndex(-1)
    resetResults()
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [mode])

  const analysisTypes = [
    { id: 'descriptive', name: 'Descriptive Statistics', description: 'Summary statistics, distributions' },
    { id: 'regression', name: 'OLS Regression', description: 'Ordinary least squares' },
    { id: 'fixed_effects', name: 'Fixed Effects', description: 'Panel data, one-way/two-way FE' },
    { id: 'logit', name: 'Logit', description: 'Binary outcome (logistic)' },
    { id: 'probit', name: 'Probit', description: 'Binary outcome (probit)' },
    { id: 'iv', name: 'IV / 2SLS', description: 'Instrumental variables' },
    { id: 'did', name: 'Diff-in-Diff', description: 'Difference-in-differences' },
    { id: 'adf_test', name: 'ADF Test', description: 'Stationarity test' },
    { id: 'acf_pacf', name: 'ACF / PACF', description: 'Autocorrelation plots' },
    { id: 'arima', name: 'ARIMA', description: 'Autoregressive model' },
    { id: 'var', name: 'VAR', description: 'Vector autoregression' },
    { id: 'vecm', name: 'VECM', description: 'Error correction model' },
  ]

  // Robustness methods
  const robustMethods = [
    { id: 'ols', name: 'OLS' },
    { id: 'fe', name: 'Fixed Effects' },
    { id: 'did', name: 'DID' },
    { id: 'iv', name: 'IV' },
    { id: 'rd', name: 'RD' },
    { id: 'logit', name: 'Logit/Probit' },
  ]

  const robustTabs = [
    { id: 'suggestions', name: 'Overview', icon: '📋' },
    { id: 'altspecs', name: 'Alt. Specs', icon: '🔄' },
    { id: 'subsample', name: 'Subsamples', icon: '📊' },
    { id: 'placebo', name: 'Placebo', icon: '💊' },
    { id: 'clustering', name: 'Clustering', icon: '🔗' },
    { id: 'export', name: 'Export All', icon: '📤' },
  ]

  // ========== NATURAL LANGUAGE MODE ==========
  const nlMethodKeywords = [
    'regression', 'OLS', 'linear regression', 'logistic regression', 'logit', 'probit',
    'fixed effects', 'random effects', 'panel data', 'two-way fixed effects',
    'instrumental variables', 'IV', '2SLS', 'difference-in-differences', 'DID',
    'regression discontinuity', 'RD', 'RDD',
    'time series', 'ARIMA', 'VAR', 'VECM', 'ADF test', 'stationarity', 'cointegration',
    'autocorrelation', 'ACF', 'PACF', 'Granger causality',
    't-test', 'F-test', 'chi-square', 'ANOVA', 'correlation', 'heteroskedasticity',
    'Breusch-Pagan', 'White test', 'VIF', 'multicollinearity',
    'log transform', 'standardize', 'normalize', 'dummy variable', 'interaction term',
    'quadratic', 'polynomial', 'lag variable', 'first difference',
    'robust standard errors', 'clustered standard errors', 'bootstrap',
    'dependent variable', 'independent variable', 'control variable',
    'treatment', 'outcome', 'covariates',
    'scatter plot', 'histogram', 'residual plot', 'fitted values', 'coefficient plot',
    'confidence interval', 'prediction interval',
    'summary statistics', 'descriptive statistics', 'regression table', 'stargazer'
  ]

  const getNlCurrentWord = useCallback((text, position) => {
    const beforeCursor = text.slice(0, position)
    const match = beforeCursor.match(/[\w-]+$/)
    return match ? match[0] : ''
  }, [])

  const getNlFilteredSuggestions = useCallback((currentWord) => {
    if (!currentWord || currentWord.length < 2) return []
    const lowerWord = currentWord.toLowerCase()
    const allSuggestions = [...columns, ...nlMethodKeywords]
    const matches = allSuggestions.filter(s => 
      s.toLowerCase().includes(lowerWord) && s.toLowerCase() !== lowerWord
    )
    matches.sort((a, b) => {
      const aStartsWith = a.toLowerCase().startsWith(lowerWord)
      const bStartsWith = b.toLowerCase().startsWith(lowerWord)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.length - b.length
    })
    return matches.slice(0, 8)
  }, [columns])

  const handleNlTextChange = (e) => {
    const newText = e.target.value
    const newPosition = e.target.selectionStart
    setNlDescription(newText)
    setNlCursorPos(newPosition)
    const currentWord = getNlCurrentWord(newText, newPosition)
    const filtered = getNlFilteredSuggestions(currentWord)
    setNlSuggestions(filtered)
    setNlShowSuggestions(filtered.length > 0)
    setNlSelectedIndex(0)
  }

  const insertNlSuggestion = useCallback((suggestion) => {
    const text = nlDescription
    const position = nlCursorPos
    const currentWord = getNlCurrentWord(text, position)
    const beforeWord = text.slice(0, position - currentWord.length)
    const afterCursor = text.slice(position)
    const newText = beforeWord + suggestion + ' ' + afterCursor
    const newPosition = beforeWord.length + suggestion.length + 1
    setNlDescription(newText)
    setNlCursorPos(newPosition)
    setNlShowSuggestions(false)
    setNlSuggestions([])
    setTimeout(() => {
      if (nlTextareaRef.current) {
        nlTextareaRef.current.focus()
        nlTextareaRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }, [nlDescription, nlCursorPos, getNlCurrentWord])

  const handleNlKeyDown = (e) => {
    if (!nlShowSuggestions || nlSuggestions.length === 0) return
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      insertNlSuggestion(nlSuggestions[nlSelectedIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setNlSelectedIndex(prev => prev < nlSuggestions.length - 1 ? prev + 1 : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setNlSelectedIndex(prev => prev > 0 ? prev - 1 : nlSuggestions.length - 1)
    } else if (e.key === 'Escape') {
      setNlShowSuggestions(false)
    }
  }

  // Close NL suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (nlTextareaRef.current && !nlTextareaRef.current.contains(e.target)) {
        setNlShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pipeline step types
  const pipelineStepTypes = [
    { id: 'descriptive', name: 'Descriptive Statistics', category: 'analysis' },
    { id: 'regression', name: 'OLS Regression', category: 'analysis' },
    { id: 'fixed_effects', name: 'Fixed Effects', category: 'analysis' },
    { id: 'logit', name: 'Logit', category: 'analysis' },
    { id: 'probit', name: 'Probit', category: 'analysis' },
    { id: 'iv', name: 'IV / 2SLS', category: 'analysis' },
    { id: 'did', name: 'Diff-in-Diff', category: 'analysis' },
    { id: 'adf_test', name: 'ADF Test', category: 'analysis' },
    { id: 'acf_pacf', name: 'ACF / PACF', category: 'analysis' },
    { id: 'arima', name: 'ARIMA', category: 'analysis' },
    { id: 'var', name: 'VAR', category: 'analysis' },
    { id: 'vecm', name: 'VECM', category: 'analysis' },
    { id: 'log_transform', name: 'Log Transform', category: 'transform' },
    { id: 'create_variable', name: 'Create Variable', icon: '➕', category: 'transform' },
    { id: 'standardize', name: 'Standardize', icon: '📏', category: 'transform' },
    { id: 'lag_variable', name: 'Create Lag', icon: '⏮️', category: 'transform' },
    { id: 'filter_data', name: 'Filter Data', icon: '🔍', category: 'transform' },
    { id: 'drop_missing', name: 'Drop Missing', icon: '🗑️', category: 'transform' },
  ]

  // Parse CSV file - handles quoted fields with commas
  const parseCSV = (text) => {
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.trim().split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }
    
    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result.map(v => v.replace(/^["']|["']$/g, ''))
    }
    
    const headers = parseCSVLine(lines[0])
    
    if (headers.length === 0 || headers.every(h => !h)) {
      throw new Error('No valid headers found in CSV')
    }
    
    const data = []
    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      if (!lines[i].trim()) continue
      const values = parseCSVLine(lines[i])
      const row = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      data.push(row)
    }
    
    return { headers, data, totalRows: lines.length - 1 }
  }

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 50MB. Please upload a smaller file.')
      return
    }

    setDataFile(file)
    setError('')
    resetResults()

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const { headers, data, totalRows } = parseCSV(text)
        setColumns(headers)
        setDataPreview({ headers, data, totalRows })
        setRawData(text)
        
        // For pipeline mode
        if (mode === 'pipeline') {
          setPipelineData(text)
          setPipelineColumns(headers)
          setPipelineSteps([])
          setCurrentStepIndex(-1)
        }
        
        resetVariableSelections()
      } catch (err) {
        setError(`Failed to parse CSV file: ${err.message}`)
        console.error(err)
      }
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
    }
    reader.readAsText(file)
  }

  const resetVariableSelections = () => {
    setDependentVar('')
    setIndependentVars([])
    setSelectedVars([])
    setInstrumentVars([])
    setEndogenousVar('')
    setTreatmentVar('')
    setTimeVar('')
    setDidOutcomeVar('')
    setTimeSeriesVar('')
    setDateVar('')
  }

  const resetResults = () => {
    setResults(null)
    setGeneratedCode('')
    setPlots([])
    setInterpretation('')
  }

  const handleDownloadPlot = (imageBase64, title) => {
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${imageBase64}`
    link.download = (title || 'plot').replace(/[^a-zA-Z0-9-_]/g, '_') + '.png'
    link.click()
  }

  // Handle variable selections
  const handleVarToggle = (varName) => {
    setSelectedVars(prev => prev.includes(varName) ? prev.filter(v => v !== varName) : [...prev, varName])
  }

  const handleIndependentVarToggle = (varName) => {
    if (varName === dependentVar) return
    setIndependentVars(prev => prev.includes(varName) ? prev.filter(v => v !== varName) : [...prev, varName])
  }

  const handleInstrumentVarToggle = (varName) => {
    if (varName === dependentVar || varName === endogenousVar) return
    setInstrumentVars(prev => prev.includes(varName) ? prev.filter(v => v !== varName) : [...prev, varName])
  }

  // Check if analysis can be run
  const canRunAnalysis = () => {
    if (!dataFile) return false
    switch (analysisType) {
      case 'descriptive': return selectedVars.length > 0
      case 'regression': return dependentVar && independentVars.length > 0
      case 'fixed_effects': return dependentVar && independentVars.length > 0
      case 'logit': return dependentVar && independentVars.length > 0
      case 'probit': return dependentVar && independentVars.length > 0
      case 'iv': return dependentVar && endogenousVar && instrumentVars.length > 0
      case 'did': return didOutcomeVar && treatmentVar && timeVar
      case 'adf_test': return timeSeriesVar
      case 'acf_pacf': return timeSeriesVar
      case 'arima': return timeSeriesVar
      case 'var': return varVariables.length >= 2
      case 'vecm': return varVariables.length >= 2
      default: return false
    }
  }

  // ========== NATURAL LANGUAGE ANALYSIS ==========
  const handleNLGenerate = async () => {
    if (!dataFile || !nlDescription.trim()) {
      setError('Please upload a CSV file and describe your analysis')
      return
    }

    setLoading(true)
    setError('')
    resetResults()
    setNlExplanation('')

    try {
      const prompt = `You are an expert econometrician and data analyst. A user has uploaded a CSV dataset and wants to perform an empirical analysis.

## Dataset Information
- **File name**: ${dataFile.name}
- **Columns**: ${columns.join(', ')}
- **Number of rows**: ${dataPreview?.totalRows || 'unknown'}
- **Sample data** (first few rows):
${JSON.stringify(dataPreview?.data?.slice(0, 3), null, 2)}

## User's Analysis Request
"${nlDescription}"

## Output Language
Generate code in **${language}**.

## Your Task
1. Understand what empirical analysis the user wants to perform based on their description.
2. Generate **complete, ready-to-run code** that:
   - Loads the CSV file (assume filename is '${dataFile.name}')
   - Performs the requested analysis
   - Includes appropriate visualizations
   - Displays results clearly
3. The code should be well-commented and follow best practices.

## Response Format
Respond in JSON format with exactly these fields:
{
  "explanation": "A brief explanation of what analysis you're performing and why it's appropriate for the user's request (2-3 sentences)",
  "code": "The complete ${language} code as a single string with proper newlines",
  "methodNotes": "Brief notes on the statistical method used, assumptions, and how to interpret results"
}

${language === 'Stata' ? `
## Stata-specific notes:
- Use standard Stata syntax
- Include "clear all" at the start
- Use "import delimited" for CSV files
- Use appropriate commands like regress, logit, xtreg, etc.
` : language === 'R' ? `
## R-specific notes:
- Use tidyverse when appropriate
- Include library() calls
- Use read.csv() or read_csv() for loading data
` : `
## Python-specific notes:
- Use pandas, statsmodels, and matplotlib/seaborn
- Include all necessary imports
- Use pd.read_csv() for loading data
`}

Generate the complete analysis code now.`

      const response = await callChatGPT(prompt)
      const content = response.content

      try {
        let jsonStr = content
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim()
        }
        const parsed = JSON.parse(jsonStr)
        setGeneratedCode(parsed.code || '')
        setNlExplanation(`${parsed.explanation || ''}\n\n**Method Notes:** ${parsed.methodNotes || ''}`)
        setInterpretation(parsed.explanation || '')
      } catch {
        const codeMatch = content.match(/```(?:python|r|stata)?\s*([\s\S]*?)```/)
        if (codeMatch) {
          setGeneratedCode(codeMatch[1].trim())
          setNlExplanation('Code generated based on your description.')
        } else {
          setGeneratedCode(content)
          setNlExplanation('Code generated based on your description.')
        }
      }
    } catch (err) {
      console.error('NL generation error:', err)
      setError(err.message || 'Failed to generate code')
    } finally {
      setLoading(false)
    }
  }

  // ========== ONE-STEP ANALYSIS ==========
  const handleAnalyze = async () => {
    if (!canRunAnalysis()) {
      setError('Please complete the required selections')
      return
    }

    setLoading(true)
    setError('')
    resetResults()

    try {
      const requestBody = buildAnalysisRequest(analysisType, rawData)
      const response = await api.post('/policy-analyst/analyze', requestBody)
      handleAnalysisResponse(response.data)
    } catch (err) {
      handleAnalysisError(err)
    } finally {
      setLoading(false)
    }
  }

  const buildAnalysisRequest = (type, data, config = {}) => {
    const base = {
      data,
      fileName: dataFile?.name || 'data.csv',
      analysisType: type,
      language,
    }

    switch (type) {
      case 'regression':
        return { ...base, dependentVar: config.dependentVar || dependentVar, independentVars: config.independentVars || independentVars }
      case 'fixed_effects': {
        const ev = config.entityVar ?? entityVar
        const effectiveEntityVar = (!ev || ev === '__row_index__') ? '__row_index__' : ev
        return { ...base, dependentVar: config.dependentVar || dependentVar, independentVars: config.independentVars || independentVars, entityVar: effectiveEntityVar, timeFeVar: config.timeFeVar || timeFeVar, feType: config.feType || feType }
      }
      case 'logit':
        return { ...base, dependentVar: config.dependentVar || dependentVar, independentVars: config.independentVars || independentVars }
      case 'probit':
        return { ...base, dependentVar: config.dependentVar || dependentVar, independentVars: config.independentVars || independentVars }
      case 'descriptive':
        return { ...base, selectedVars: config.selectedVars || selectedVars }
      case 'iv':
        return { ...base, dependentVar: config.dependentVar || dependentVar, endogenousVar: config.endogenousVar || endogenousVar, instrumentVars: config.instrumentVars || instrumentVars, exogenousVars: config.exogenousVars || independentVars }
      case 'did':
        return { ...base, outcomeVar: config.outcomeVar || didOutcomeVar, treatmentVar: config.treatmentVar || treatmentVar, timeVar: config.timeVar || timeVar, controlVars: config.controlVars || independentVars }
      case 'adf_test':
      case 'acf_pacf':
        return { ...base, timeSeriesVar: config.timeSeriesVar || timeSeriesVar, dateVar: config.dateVar || dateVar }
      case 'arima':
        return { ...base, timeSeriesVar: config.timeSeriesVar || timeSeriesVar, dateVar: config.dateVar || dateVar, arimaP: config.arimaP ?? arimaP, arimaD: config.arimaD ?? arimaD, arimaQ: config.arimaQ ?? arimaQ }
      case 'var':
        return { ...base, varVariables: config.varVariables || varVariables, varLags: config.varLags ?? varLags, dateVar: config.dateVar || dateVar }
      case 'vecm':
        return { ...base, varVariables: config.varVariables || varVariables, varLags: config.varLags ?? varLags, vecmRank: config.vecmRank ?? vecmRank, dateVar: config.dateVar || dateVar }
      default:
        return base
    }
  }

  const handleAnalysisResponse = (data) => {
    setResults(data.results)
    setGeneratedCode(data.code || '')
    setPlots(data.plots || [])
    setInterpretation(data.interpretation || '')
  }

  const handleAnalysisError = (err) => {
    console.error('Analysis error:', err)
    if (err.response?.data?.message) {
      setError(err.response.data.message)
    } else if (err.response?.data?.error) {
      setError(err.response.data.error)
    } else {
      setError('Analysis failed. Please check your data and try again.')
    }
  }

  // ========== PIPELINE MODE FUNCTIONS ==========
  const addPipelineStep = async () => {
    if (!newStepType) return

    const stepConfig = { ...newStepConfig }
    const newStep = {
      id: Date.now(),
      type: newStepType,
      config: stepConfig,
      status: 'pending',
      results: null,
      code: '',
      plots: [],
      interpretation: '',
      outputData: null,
      outputColumns: null,
    }

    // Execute the step
    setLoading(true)
    setError('')

    try {
      const currentData = pipelineSteps.length > 0 
        ? pipelineSteps[pipelineSteps.length - 1].outputData || pipelineData 
        : pipelineData

      const stepType = pipelineStepTypes.find(t => t.id === newStepType)
      
      if (stepType?.category === 'transform') {
        // Data transformation step
        const response = await api.post('/policy-analyst/transform', {
          data: currentData,
          transformType: newStepType,
          config: stepConfig,
          language,
        })
        
        newStep.status = 'completed'
        newStep.outputData = response.data.transformedData
        newStep.outputColumns = response.data.columns
        newStep.code = response.data.code || ''
        newStep.interpretation = response.data.description || ''
        
        // Update pipeline columns
        setPipelineColumns(response.data.columns)
      } else {
        // Analysis step
        const requestBody = buildAnalysisRequest(newStepType, currentData, stepConfig)
        const response = await api.post('/policy-analyst/analyze', requestBody)
        
        newStep.status = 'completed'
        newStep.results = response.data.results
        newStep.code = response.data.code || ''
        newStep.plots = response.data.plots || []
        newStep.interpretation = response.data.interpretation || ''
        newStep.outputData = currentData // Analysis doesn't change data
        newStep.outputColumns = pipelineColumns
      }

      setPipelineSteps(prev => [...prev, newStep])
      setCurrentStepIndex(pipelineSteps.length)
      setShowAddStep(false)
      setNewStepType('')
      setNewStepConfig({})

    } catch (err) {
      console.error('Step execution error:', err)
      newStep.status = 'error'
      newStep.error = err.response?.data?.message || err.message
      setPipelineSteps(prev => [...prev, newStep])
      setError(err.response?.data?.message || 'Step execution failed')
    } finally {
      setLoading(false)
    }
  }

  const removeStep = (index) => {
    setPipelineSteps(prev => prev.filter((_, i) => i !== index))
    if (currentStepIndex >= index) {
      setCurrentStepIndex(Math.max(-1, currentStepIndex - 1))
    }
    // Recalculate columns based on remaining steps
    if (pipelineSteps.length > 1 && index < pipelineSteps.length) {
      const lastValidStep = pipelineSteps[Math.max(0, index - 1)]
      if (lastValidStep?.outputColumns) {
        setPipelineColumns(lastValidStep.outputColumns)
      }
    } else {
      setPipelineColumns(columns)
    }
  }

  const selectStep = (index) => {
    setCurrentStepIndex(index)
  }

  // Export pipeline report
  const exportPipelineReport = () => {
    let report = '# Empirical Analysis Pipeline Report\n\n'
    report += `Data File: ${dataFile?.name || 'Unknown'}\n`
    report += `Date: ${new Date().toLocaleString()}\n\n`
    report += '---\n\n'

    pipelineSteps.forEach((step, index) => {
      const stepType = pipelineStepTypes.find(t => t.id === step.type)
      report += `## Step ${index + 1}: ${stepType?.name || step.type}\n\n`
      
      if (step.interpretation) {
        report += `${step.interpretation}\n\n`
      }
      
      if (step.results) {
        report += '### Results\n'
        report += '```json\n' + JSON.stringify(step.results, null, 2) + '\n```\n\n'
      }
      
      report += '---\n\n'
    })

    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pipeline_report.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export pipeline code
  const exportPipelineCode = () => {
    let code = language === 'Python' 
      ? '# Empirical Analysis Pipeline\n# Generated by AI4ECPP\n\nimport pandas as pd\nimport numpy as np\nimport statsmodels.api as sm\n\n'
      : '# Empirical Analysis Pipeline\n# Generated by AI4ECPP\n\nlibrary(tidyverse)\n\n'

    code += `# Load data\n`
    code += language === 'Python' 
      ? `df = pd.read_csv('${dataFile?.name || 'data.csv'}')\n\n`
      : `df <- read.csv('${dataFile?.name || 'data.csv'}')\n\n`

    pipelineSteps.forEach((step, index) => {
      const stepType = pipelineStepTypes.find(t => t.id === step.type)
      code += `# Step ${index + 1}: ${stepType?.name || step.type}\n`
      if (step.code) {
        // Extract just the analysis code, not the full setup
        const codeLines = step.code.split('\n').filter(line => 
          !line.includes('read_csv') && 
          !line.includes('import ') && 
          !line.includes('library(') &&
          line.trim()
        )
        code += codeLines.join('\n') + '\n\n'
      }
    })

    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pipeline_code.${language === 'Python' ? 'py' : 'r'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all
  const handleClear = () => {
    setDataFile(null)
    setDataPreview(null)
    setColumns([])
    setRawData('')
    setAnalysisRequest('')
    resetVariableSelections()
    resetResults()
    setError('')
    setPipelineSteps([])
    setCurrentStepIndex(-1)
    setPipelineData('')
    setPipelineColumns([])
    // Reset robustness states
    setRobustDepVar('')
    setRobustIndepVars('')
    setRobustControlVars('')
    setRobustFixedEffects('')
    setRobustClusterVar('')
    setRobustDataDesc('')
    setRobustResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ========== ROBUSTNESS MODE FUNCTIONS ==========
  
  // Handle code file upload for robustness
  const handleRobustCodeFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const validExtensions = ['.r', '.R', '.py', '.do', '.stata', '.txt']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(ext) && ext !== '.r') {
      setError('Please upload a valid code file (.R, .py, .do, .stata, .txt)')
      return
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 50MB. Please upload a smaller file.')
      return
    }
    
    setRobustCodeFile(file)
    setError('')
    
    // Auto-detect language
    if (ext === '.r' || ext === '.R') {
      setRobustCodeLang('r')
    } else if (ext === '.py') {
      setRobustCodeLang('python')
    } else if (ext === '.do' || ext === '.stata') {
      setRobustCodeLang('stata')
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setRobustOriginalCode(event.target.result)
    }
    reader.readAsText(file)
  }

  // Generate robustness from code
  const handleGenerateRobustnessFromCode = async () => {
    if (!robustOriginalCode.trim()) {
      setError('Please provide your original regression code')
      return
    }

    setLoading(true)
    setError('')
    setRobustResult(null)

    try {
      const dataInfo = columns.length > 0 
        ? `\n\nAvailable variables in data: ${columns.join(', ')}`
        : ''

      const prompt = `You are an expert econometrician helping researchers generate robustness and sensitivity checks. 

**Original Regression Code (${robustCodeLang}):**
\`\`\`${robustCodeLang}
${robustOriginalCode}
\`\`\`
${dataInfo}

Analyze this code and generate comprehensive robustness checks. First, identify:
1. The dependent variable(s)
2. The main independent variable(s) of interest
3. Control variables
4. Fixed effects (if any)
5. Clustering (if any)
6. The econometric method used

Then generate robustness checks in the following JSON format:

{
  "codeAnalysis": {
    "dependentVar": "identified dependent variable",
    "mainIndepVar": "identified main independent variable(s)",
    "controls": "identified controls",
    "fixedEffects": "identified fixed effects",
    "clustering": "identified clustering",
    "method": "identified method (OLS/FE/DID/IV/RD/etc.)",
    "summary": "Brief summary of what the regression does"
  },
  
  "summary": "Brief overview of the robustness testing strategy tailored to this specific regression",
  
  "alternativeSpecs": [
    {
      "name": "Name of the alternative specification",
      "description": "What this tests and why it matters",
      "changes": "What changes from main spec",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code", 
      "pythonCode": "Complete Python code",
      "expectedResult": "What result would support main findings"
    }
  ],
  
  "subsampleTests": [
    {
      "name": "Name of subsample test",
      "description": "Rationale for this subsample",
      "subsampleDefinition": "How to define the subsample",
      "stataCode": "Stata code",
      "rCode": "R code",
      "pythonCode": "Python code",
      "interpretation": "How to interpret results"
    }
  ],
  
  "placeboTests": [
    {
      "name": "Name of placebo test",
      "description": "What this placebo tests",
      "nullHypothesis": "What we expect if main result is valid",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code",
      "pythonCode": "Complete Python code"
    }
  ],
  
  "clusteringAlternatives": [
    {
      "name": "Alternative clustering approach",
      "rationale": "Why this clustering might be appropriate",
      "stataCode": "Stata code",
      "rCode": "R code",
      "pythonCode": "Python code"
    }
  ],
  
  "additionalChecks": [
    {
      "name": "Additional robustness check",
      "category": "e.g., 'Functional Form', 'Measurement', 'Sample Period'",
      "description": "What this tests",
      "stataCode": "Stata code",
      "rCode": "R code",
      "pythonCode": "Python code"
    }
  ],
  
  "latexTableTemplate": "LaTeX code for a robustness table template"
}

Make the code realistic and complete. Use the same variable names from the original code.`

      const response = await callChatGPT(prompt)
      const content = response.content

      let parsed
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch (parseErr) {
        console.error('Parse error:', parseErr)
        parsed = {
          codeAnalysis: { summary: 'Could not parse code analysis' },
          summary: content,
          alternativeSpecs: [],
          subsampleTests: [],
          placeboTests: [],
          clusteringAlternatives: [],
          additionalChecks: []
        }
      }

      setRobustResult(parsed)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate robustness checks')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRobustness = async () => {
    if (!robustDepVar.trim() || !robustIndepVars.trim()) {
      setError('Please enter at least dependent and independent variables')
      return
    }

    setLoading(true)
    setError('')
    setRobustResult(null)

    try {
      const methodName = robustMethods.find(m => m.id === robustMethod)?.name || robustMethod

      const prompt = `You are an expert econometrician helping researchers generate robustness and sensitivity checks for their empirical analysis.

**Main Specification Details:**
- Dependent Variable: ${robustDepVar}
- Main Independent Variable(s): ${robustIndepVars}
- Control Variables: ${robustControlVars || 'Not specified'}
- Fixed Effects: ${robustFixedEffects || 'None'}
- Clustering: ${robustClusterVar || 'Not specified'}
- Method: ${methodName}
- Data Description: ${robustDataDesc || 'Not provided'}

Please generate robustness checks in the following JSON format:

{
  "summary": "Brief overview of the robustness testing strategy",
  
  "alternativeSpecs": [
    {
      "name": "Name of the alternative specification",
      "description": "What this tests and why it matters",
      "changes": "What changes from main spec",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code"
    }
  ],
  
  "subsampleTests": [
    {
      "name": "Name of subsample test",
      "description": "Rationale for this subsample",
      "stataCode": "Stata code",
      "rCode": "R code"
    }
  ],
  
  "placeboTests": [
    {
      "name": "Name of placebo test",
      "description": "What this placebo tests",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code"
    }
  ],
  
  "clusteringAlternatives": [
    {
      "name": "Alternative clustering approach",
      "rationale": "Why this clustering might be appropriate",
      "stataCode": "Stata code",
      "rCode": "R code"
    }
  ],
  
  "latexTableTemplate": "LaTeX code for a robustness table template"
}

Make the code realistic and complete. Use standard packages (reghdfe, estout for Stata; fixest, modelsummary for R).`

      const response = await callChatGPT(prompt)
      const content = response.content

      let parsed
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch (parseErr) {
        parsed = {
          summary: content,
          alternativeSpecs: [],
          subsampleTests: [],
          placeboTests: [],
          clusteringAlternatives: []
        }
      }

      setRobustResult(parsed)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate robustness checks')
    } finally {
      setLoading(false)
    }
  }

  const getAllRobustCode = (type) => {
    if (!robustResult) return ''
    
    const codeKey = type === 'stata' ? 'stataCode' : type === 'r' ? 'rCode' : 'pythonCode'
    const comment = type === 'stata' ? '*' : '#'
    
    let allCode = `${comment} ========================================\n`
    allCode += `${comment} ROBUSTNESS AND SENSITIVITY CHECKS\n`
    allCode += `${comment} Generated by AI4ECPP\n`
    allCode += `${comment} ========================================\n\n`

    if (robustResult.alternativeSpecs?.length > 0) {
      allCode += `${comment} --- ALTERNATIVE SPECIFICATIONS ---\n\n`
      robustResult.alternativeSpecs.forEach((spec, idx) => {
        allCode += `${comment} ${idx + 1}. ${spec.name}\n`
        allCode += `${spec[codeKey] || ''}\n\n`
      })
    }

    if (robustResult.subsampleTests?.length > 0) {
      allCode += `${comment} --- SUBSAMPLE TESTS ---\n\n`
      robustResult.subsampleTests.forEach((test, idx) => {
        allCode += `${comment} ${idx + 1}. ${test.name}\n`
        allCode += `${test[codeKey] || ''}\n\n`
      })
    }

    if (robustResult.placeboTests?.length > 0) {
      allCode += `${comment} --- PLACEBO TESTS ---\n\n`
      robustResult.placeboTests.forEach((test, idx) => {
        allCode += `${comment} ${idx + 1}. ${test.name}\n`
        allCode += `${test[codeKey] || ''}\n\n`
      })
    }

    if (robustResult.clusteringAlternatives?.length > 0) {
      allCode += `${comment} --- ALTERNATIVE CLUSTERING ---\n\n`
      robustResult.clusteringAlternatives.forEach((cluster, idx) => {
        allCode += `${comment} ${idx + 1}. ${cluster.name}\n`
        allCode += `${cluster[codeKey] || ''}\n\n`
      })
    }

    return allCode
  }

  const downloadRobustCode = (type) => {
    const code = getAllRobustCode(type)
    const ext = type === 'stata' ? 'do' : type === 'r' ? 'R' : 'py'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `robustness_checks.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  // Pre-fill robustness from pipeline
  const prefillRobustnessFromPipeline = () => {
    // Find the last regression step in pipeline
    const regressionStep = [...pipelineSteps].reverse().find(s => 
      s.type === 'regression' || s.type === 'did' || s.type === 'iv'
    )
    
    if (regressionStep?.config) {
      setRobustDepVar(regressionStep.config.dependentVar || '')
      setRobustIndepVars((regressionStep.config.independentVars || []).join(', '))
      if (regressionStep.type === 'did') {
        setRobustMethod('did')
      } else if (regressionStep.type === 'iv') {
        setRobustMethod('iv')
      }
    }
    
    setMode('robustness')
  }

  // Download code (one-step mode)
  const handleDownloadCode = () => {
    const extension = language === 'R' ? 'r' : 'py'
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analysisType}_analysis.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render step config form for pipeline
  const renderStepConfigForm = () => {
    const stepType = pipelineStepTypes.find(t => t.id === newStepType)
    if (!stepType) return null

    const currentCols = pipelineSteps.length > 0 
      ? pipelineSteps[pipelineSteps.length - 1].outputColumns || pipelineColumns 
      : pipelineColumns

    if (stepType.category === 'transform') {
      switch (newStepType) {
        case 'log_transform':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Variable to Transform</label>
              <select
                value={newStepConfig.variable || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, variable: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select variable...</option>
                {currentCols.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <label className="block text-sm font-medium text-gray-700">New Variable Name</label>
              <input
                type="text"
                value={newStepConfig.newName || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, newName: e.target.value })}
                placeholder={`log_${newStepConfig.variable || 'var'}`}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )
        case 'create_variable':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">New Variable Name</label>
              <input
                type="text"
                value={newStepConfig.newName || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, newName: e.target.value })}
                placeholder="new_variable"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <label className="block text-sm font-medium text-gray-700">Formula (Python/R syntax)</label>
              <input
                type="text"
                value={newStepConfig.formula || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, formula: e.target.value })}
                placeholder="e.g., var1 + var2 or var1 * var2"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500">Available: {currentCols.join(', ')}</p>
            </div>
          )
        case 'standardize':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Variable to Standardize</label>
              <select
                value={newStepConfig.variable || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, variable: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select variable...</option>
                {currentCols.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          )
        case 'lag_variable':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Variable</label>
              <select
                value={newStepConfig.variable || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, variable: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select variable...</option>
                {currentCols.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <label className="block text-sm font-medium text-gray-700">Lag Periods</label>
              <input
                type="number"
                value={newStepConfig.lag || 1}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, lag: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )
        case 'filter_data':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Filter Variable</label>
              <select
                value={newStepConfig.variable || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, variable: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select variable...</option>
                {currentCols.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <select
                value={newStepConfig.operator || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, operator: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select condition...</option>
                <option value=">">&gt; Greater than</option>
                <option value=">=">&gt;= Greater or equal</option>
                <option value="<">&lt; Less than</option>
                <option value="<=">&lt;= Less or equal</option>
                <option value="==">== Equal to</option>
                <option value="!=">!= Not equal to</option>
              </select>
              <label className="block text-sm font-medium text-gray-700">Value</label>
              <input
                type="text"
                value={newStepConfig.value || ''}
                onChange={(e) => setNewStepConfig({ ...newStepConfig, value: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )
        case 'drop_missing':
          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Variables (leave empty for all)</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {currentCols.map(col => (
                  <button
                    key={col}
                    onClick={() => {
                      const vars = newStepConfig.variables || []
                      setNewStepConfig({
                        ...newStepConfig,
                        variables: vars.includes(col) ? vars.filter(v => v !== col) : [...vars, col]
                      })
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      (newStepConfig.variables || []).includes(col) 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )
        default:
          return null
      }
    } else {
      // Analysis step config
      return renderAnalysisConfig(newStepType, currentCols)
    }
  }

  const renderAnalysisConfig = (type, cols) => {
    switch (type) {
      case 'descriptive':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Select Variables</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {cols.map(col => (
                <button
                  key={col}
                  onClick={() => {
                    const vars = newStepConfig.selectedVars || []
                    setNewStepConfig({
                      ...newStepConfig,
                      selectedVars: vars.includes(col) ? vars.filter(v => v !== col) : [...vars, col]
                    })
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    (newStepConfig.selectedVars || []).includes(col) 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )
      case 'regression':
      case 'logit':
      case 'probit':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Dependent Variable (Y) {(newStepType === 'logit' || newStepType === 'probit') && <span className="text-gray-400">- Binary 0/1</span>}
            </label>
            <select
              value={newStepConfig.dependentVar || ''}
              onChange={(e) => setNewStepConfig({ ...newStepConfig, dependentVar: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select...</option>
              {cols.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
            <label className="block text-sm font-medium text-gray-700">Independent Variables (X)</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {cols.filter(c => c !== newStepConfig.dependentVar).map(col => (
                <button
                  key={col}
                  onClick={() => {
                    const vars = newStepConfig.independentVars || []
                    setNewStepConfig({
                      ...newStepConfig,
                      independentVars: vars.includes(col) ? vars.filter(v => v !== col) : [...vars, col]
                    })
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    (newStepConfig.independentVars || []).includes(col) 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )
      case 'timeseries':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Time Series Variable</label>
            <select
              value={newStepConfig.timeSeriesVar || ''}
              onChange={(e) => setNewStepConfig({ ...newStepConfig, timeSeriesVar: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select...</option>
              {cols.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )
      default:
        return <p className="text-sm text-gray-500">Configure this step type in One-Step mode for full options.</p>
    }
  }

  // Render current step results in pipeline
  const renderCurrentStepResults = () => {
    if (currentStepIndex < 0 || currentStepIndex >= pipelineSteps.length) {
      return (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Step</h3>
          <p className="text-gray-500">Click on a step in the pipeline to view its results.</p>
        </div>
      )
    }

    const step = pipelineSteps[currentStepIndex]
    const stepType = pipelineStepTypes.find(t => t.id === step.type)

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {stepType?.name}
          </h3>
          {step.status === 'error' && (
            <div className="bg-red-50 text-red-700 p-3 rounded">{step.error}</div>
          )}
          {step.interpretation && (
            <div className="bg-blue-50 p-4 rounded-lg mt-2">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{step.interpretation}</pre>
            </div>
          )}
        </div>

        {step.results && (
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Results</h4>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(step.results, null, 2)}
            </pre>
          </div>
        )}

        {step.plots && step.plots.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Plots</h4>
            {step.plots.map((plot, idx) => (
              <div key={idx} className="relative group mb-4">
                <img
                  src={`data:image/png;base64,${plot.image}`}
                  alt={plot.title}
                  className="w-full rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => setPlotModal({ image: plot.image, title: plot.title })}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadPlot(plot.image, plot.title); }}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition"
                >
                  Download
                </button>
                <p className="text-xs text-gray-500 mt-1">Click to zoom</p>
              </div>
            ))}
          </div>
        )}

        {step.code && (
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Code</h4>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-48">
              {step.code}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // ========== RENDER FUNCTIONS FOR ONE-STEP MODE ==========
  const renderVariableSelection = () => {
    if (columns.length === 0) return null
    const cols = columns

    switch (analysisType) {
      case 'descriptive':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Select Variables</h3>
            <div className="flex flex-wrap gap-2">
              {cols.map((col, idx) => (
                <button key={idx} onClick={() => handleVarToggle(col)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedVars.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {col}
                </button>
              ))}
            </div>
            {selectedVars.length > 0 && <p className="mt-3 text-sm text-emerald-600">Selected: {selectedVars.join(', ')}</p>}
          </div>
        )

      case 'regression':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Regression Variables</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Variable (Y)</label>
              <select value={dependentVar} onChange={(e) => { setDependentVar(e.target.value); setIndependentVars(prev => prev.filter(v => v !== e.target.value)) }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                <option value="">Select...</option>
                {cols.map((col, idx) => <option key={idx} value={col}>{col}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Independent Variables (X)</label>
              <div className="flex flex-wrap gap-2">
                {cols.filter(col => col !== dependentVar).map((col, idx) => (
                  <button key={idx} onClick={() => handleIndependentVarToggle(col)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${independentVars.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'logit':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Logit Variables</h3>
            <p className="text-sm text-gray-500 mb-4">For binary outcomes (0/1). Uses logistic regression.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Variable (Y) - Binary 0/1</label>
              <select value={dependentVar} onChange={(e) => { setDependentVar(e.target.value); setIndependentVars(prev => prev.filter(v => v !== e.target.value)) }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                <option value="">Select...</option>
                {cols.map((col, idx) => <option key={idx} value={col}>{col}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Independent Variables (X)</label>
              <div className="flex flex-wrap gap-2">
                {cols.filter(col => col !== dependentVar).map((col, idx) => (
                  <button key={idx} onClick={() => handleIndependentVarToggle(col)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${independentVars.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'probit':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Probit Variables</h3>
            <p className="text-sm text-gray-500 mb-4">For binary outcomes (0/1). Uses normal CDF link function.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Variable (Y) - Binary 0/1</label>
              <select value={dependentVar} onChange={(e) => { setDependentVar(e.target.value); setIndependentVars(prev => prev.filter(v => v !== e.target.value)) }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                <option value="">Select...</option>
                {cols.map((col, idx) => <option key={idx} value={col}>{col}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Independent Variables (X)</label>
              <div className="flex flex-wrap gap-2">
                {cols.filter(col => col !== dependentVar).map((col, idx) => (
                  <button key={idx} onClick={() => handleIndependentVarToggle(col)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${independentVars.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'fixed_effects':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Fixed Effects Variables</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Effects Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setFeType('entity')} className={`px-4 py-2 rounded-lg text-sm ${feType === 'entity' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Entity FE</button>
                  <button onClick={() => setFeType('time')} className={`px-4 py-2 rounded-lg text-sm ${feType === 'time' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Time FE</button>
                  <button onClick={() => setFeType('twoway')} className={`px-4 py-2 rounded-lg text-sm ${feType === 'twoway' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Two-Way FE</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Variable (Y)</label>
                <select value={dependentVar} onChange={(e) => { setDependentVar(e.target.value); setIndependentVars(prev => prev.filter(v => v !== e.target.value)) }}
                  className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Independent Variables (X)</label>
                <div className="flex flex-wrap gap-2">
                  {cols.filter(col => col !== dependentVar && col !== entityVar && col !== timeFeVar).map(col => (
                    <button key={col} onClick={() => handleIndependentVarToggle(col)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${independentVars.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity ID Variable (e.g., firm_id, country)</label>
                <select value={entityVar} onChange={(e) => setEntityVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  <option value="__row_index__">Use row index (1, 2, 3...)</option>
                  {cols.filter(c => c !== dependentVar && !independentVars.includes(c)).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">If your CSV has no ID column, select &quot;Use row index&quot; to use row numbers as entity ID.</p>
              </div>
              {(feType === 'time' || feType === 'twoway') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Variable (e.g., year)</label>
                  <select value={timeFeVar} onChange={(e) => setTimeFeVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">Select...</option>
                    {cols.filter(c => c !== dependentVar && c !== entityVar && !independentVars.includes(c)).map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )

      case 'iv':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">IV / 2SLS Variables</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Variable (Y)</label>
                <select value={dependentVar} onChange={(e) => setDependentVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endogenous Variable</label>
                <select value={endogenousVar} onChange={(e) => setEndogenousVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.filter(c => c !== dependentVar).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruments (Z)</label>
                <div className="flex flex-wrap gap-2">
                  {cols.filter(c => c !== dependentVar && c !== endogenousVar).map(col => (
                    <button key={col} onClick={() => handleInstrumentVarToggle(col)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${instrumentVars.includes(col) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'did':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">DID Variables</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Outcome Variable</label>
                <select value={didOutcomeVar} onChange={(e) => setDidOutcomeVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Variable (0/1)</label>
                <select value={treatmentVar} onChange={(e) => setTreatmentVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.filter(c => c !== didOutcomeVar).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time/Post Variable (0/1)</label>
                <select value={timeVar} onChange={(e) => setTimeVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.filter(c => c !== didOutcomeVar && c !== treatmentVar).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </div>
          </div>
        )

      case 'adf_test':
      case 'acf_pacf':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{analysisType === 'adf_test' ? 'ADF Test' : 'ACF / PACF'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Series Variable</label>
                <select value={timeSeriesVar} onChange={(e) => setTimeSeriesVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Column (Optional)</label>
                <select value={dateVar} onChange={(e) => setDateVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Use row index...</option>
                  {cols.filter(c => c !== timeSeriesVar).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </div>
          </div>
        )

      case 'arima':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">ARIMA Model</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Series Variable</label>
                <select value={timeSeriesVar} onChange={(e) => setTimeSeriesVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Column (Optional)</label>
                <select value={dateVar} onChange={(e) => setDateVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Use row index...</option>
                  {cols.filter(c => c !== timeSeriesVar).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">p (AR order)</label>
                  <input type="number" min="0" max="10" value={arimaP} onChange={(e) => setArimaP(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">d (Differencing)</label>
                  <input type="number" min="0" max="3" value={arimaD} onChange={(e) => setArimaD(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">q (MA order)</label>
                  <input type="number" min="0" max="10" value={arimaQ} onChange={(e) => setArimaQ(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )

      case 'var':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">VAR Model</h3>
            <p className="text-sm text-gray-500 mb-4">Select at least 2 endogenous variables for VAR estimation.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endogenous Variables (min 2)</label>
                <div className="flex flex-wrap gap-2">
                  {cols.map(col => (
                    <button key={col} onClick={() => setVarVariables(prev => prev.includes(col) ? prev.filter(v => v !== col) : [...prev, col])}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${varVariables.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {col}
                    </button>
                  ))}
                </div>
                {varVariables.length > 0 && <p className="mt-2 text-sm text-emerald-600">Selected: {varVariables.join(', ')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lag Order</label>
                <input type="number" min="1" max="12" value={varLags} onChange={(e) => setVarLags(parseInt(e.target.value) || 1)}
                  className="w-32 px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Column (Optional)</label>
                <select value={dateVar} onChange={(e) => setDateVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Use row index...</option>
                  {cols.filter(c => !varVariables.includes(c)).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </div>
          </div>
        )

      case 'vecm':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">VECM Model</h3>
            <p className="text-sm text-gray-500 mb-4">Vector Error Correction Model for cointegrated time series.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endogenous Variables (min 2)</label>
                <div className="flex flex-wrap gap-2">
                  {cols.map(col => (
                    <button key={col} onClick={() => setVarVariables(prev => prev.includes(col) ? prev.filter(v => v !== col) : [...prev, col])}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${varVariables.includes(col) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {col}
                    </button>
                  ))}
                </div>
                {varVariables.length > 0 && <p className="mt-2 text-sm text-emerald-600">Selected: {varVariables.join(', ')}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lag Order</label>
                  <input type="number" min="1" max="12" value={varLags} onChange={(e) => setVarLags(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cointegration Rank</label>
                  <input type="number" min="1" max={Math.max(1, varVariables.length - 1)} value={vecmRank} 
                    onChange={(e) => setVecmRank(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Column (Optional)</label>
                <select value={dateVar} onChange={(e) => setDateVar(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Use row index...</option>
                  {cols.filter(c => !varVariables.includes(c)).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderResults = () => {
    if (!results) return null
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Results</h3>
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    )
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profession-dashboard')} className="text-gray-600 hover:text-gray-900">
              ← Back
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Empirical Analyst AI</h1>
          </div>
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('oneStep')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${mode === 'oneStep' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}
            >
              One-Step
            </button>
            <button
              onClick={() => setMode('robustness')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${mode === 'robustness' ? 'bg-white shadow text-teal-600' : 'text-gray-600'}`}
            >
              Robustness
            </button>
            <button
              onClick={() => setMode('pipeline')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${mode === 'pipeline' ? 'bg-white shadow text-purple-600' : 'text-gray-600'}`}
            >
              Pipeline
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className={`rounded-xl p-6 text-white mb-8 ${
          mode === 'pipeline' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 
          mode === 'robustness' ? 'bg-gradient-to-r from-teal-500 to-emerald-600' :
          'bg-gradient-to-r from-emerald-500 to-teal-600'
        }`}>
          <h2 className="text-2xl font-bold mb-2">
            {mode === 'pipeline' ? '🔧 Pipeline Mode' : 
             mode === 'robustness' ? '🧪 Robustness Generator' :
             '⚡ One-Step Analysis'}
          </h2>
          <p className="opacity-90">
            {mode === 'pipeline' 
              ? 'Build your analysis workflow step by step. Transform data, run analyses, and export a complete report.'
              : mode === 'robustness'
              ? 'Generate appendix-ready robustness checks: alternative specs, subsample tests, placebo tests, and different clustering options.'
              : 'Upload data, select variables, and run a single analysis with one click.'}
          </p>
        </div>

        {mode === 'oneStep' ? (
          // ========== ONE-STEP MODE UI ==========
          <>
            {/* Input Mode Toggle */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="flex">
                <button
                  onClick={() => setOneStepInputMode('form')}
                  className={`flex-1 py-3 px-4 text-center font-semibold transition ${
                    oneStepInputMode === 'form'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📋 Form Mode
                </button>
                <button
                  onClick={() => setOneStepInputMode('nl')}
                  className={`flex-1 py-3 px-4 text-center font-semibold transition ${
                    oneStepInputMode === 'nl'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  💬 Natural Language
                </button>
              </div>
            </div>

            {oneStepInputMode === 'form' ? (
              <>
                {/* Analysis Type Selection */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🔬 Step 1: Choose Analysis Type</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {analysisTypes.map((type) => (
                      <button key={type.id} onClick={() => { setAnalysisType(type.id); resetResults() }}
                        className={`p-3 rounded-lg border-2 text-center transition ${analysisType === type.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                        <div className="font-medium text-sm">{type.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Data Upload */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">📁 Step 2: Upload Data</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="data-upload" />
                        <label htmlFor="data-upload" className="cursor-pointer inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                          Choose CSV File
                        </label>
                        {dataFile && <p className="mt-3 text-gray-600">✅ {dataFile.name}</p>}
                      </div>
                      {dataPreview && (
                        <div className="mt-4 overflow-x-auto border rounded-lg max-h-48">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>{dataPreview.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {dataPreview.data.map((row, i) => (
                                <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                                  {dataPreview.headers.map((h, j) => <td key={j} className="px-3 py-2">{row[h]}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Variable Selection */}
                    {columns.length > 0 && renderVariableSelection()}

                    {/* Config & Run */}
                    {columns.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ Configure & Run</h3>
                        <div className="flex gap-4 mb-4">
                          <button onClick={() => setLanguage('Python')} className={`px-4 py-2 rounded-lg ${language === 'Python' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>🐍 Python</button>
                          <button onClick={() => setLanguage('R')} className={`px-4 py-2 rounded-lg ${language === 'R' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>📊 R</button>
                        </div>
                        {error && <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">{error}</div>}
                        <div className="flex gap-3">
                          <button onClick={handleAnalyze} disabled={loading || !canRunAnalysis()}
                            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50">
                            {loading ? '⏳ Analyzing...' : '🚀 Run Analysis'}
                          </button>
                          <button onClick={handleClear} className="px-6 py-3 bg-gray-200 rounded-lg">Clear</button>
                        </div>
                      </div>
                    )}
              </div>

              {/* Results */}
              <div className="space-y-6">
                {renderResults()}
                {plots.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Plots</h3>
                    {plots.map((plot, idx) => (
                      <div key={idx} className="relative group mb-4">
                        <img
                          src={`data:image/png;base64,${plot.image}`}
                          alt={plot.title}
                          className="w-full rounded cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPlotModal({ image: plot.image, title: plot.title })}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadPlot(plot.image, plot.title); }}
                          className="absolute top-2 right-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          Download
                        </button>
                        <p className="text-xs text-gray-500 mt-1">Click to zoom</p>
                      </div>
                    ))}
                  </div>
                )}
                {interpretation && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Interpretation</h3>
                    <div className="bg-blue-50 p-4 rounded-lg whitespace-pre-wrap text-sm">{interpretation}</div>
                  </div>
                )}
                {generatedCode && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">💻 Code</h3>
                      <button onClick={handleDownloadCode} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg">Download</button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-64">{generatedCode}</pre>
                  </div>
                )}
                {!results && !loading && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-gray-700">Results Will Appear Here</h3>
                  </div>
                )}
              </div>
            </div>
              </>
            ) : (
              // ========== NATURAL LANGUAGE MODE UI ==========
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Data Upload */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📁 Upload Data</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="nl-data-upload" />
                      <label htmlFor="nl-data-upload" className="cursor-pointer inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                        Choose CSV File
                      </label>
                      {dataFile && <p className="mt-3 text-gray-600">✅ {dataFile.name}</p>}
                    </div>
                    {dataPreview && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-2">
                          {dataPreview.totalRows} rows • {columns.length} columns
                        </div>
                        <div className="overflow-x-auto border rounded-lg max-h-40">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>{dataPreview.headers.map((h, i) => <th key={i} className="px-2 py-1 text-left">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {dataPreview.data.slice(0, 3).map((row, i) => (
                                <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                                  {dataPreview.headers.map((h, j) => <td key={j} className="px-2 py-1">{row[h]}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Natural Language Input */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">💬 Describe Your Analysis</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Describe what analysis you want to perform in plain English. Use variable names from your data. 
                      Start typing and use Tab/Enter to autocomplete suggestions.
                    </p>
                    
                    <div className="relative">
                      <textarea
                        ref={nlTextareaRef}
                        value={nlDescription}
                        onChange={handleNlTextChange}
                        onKeyDown={handleNlKeyDown}
                        placeholder={`Example: Run a fixed effects regression with log_wage as the dependent variable, treatment and education as independent variables, with state and year fixed effects, and cluster standard errors by state.

Or: Perform difference-in-differences analysis where ${columns[0] || 'outcome'} is the outcome, ${columns[1] || 'treated'} is the treatment indicator, and ${columns[2] || 'post'} indicates the post-treatment period.`}
                        className="w-full h-40 px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                      
                      {/* Autocomplete dropdown */}
                      {nlShowSuggestions && nlSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {nlSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => insertNlSuggestion(suggestion)}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 ${
                                idx === nlSelectedIndex ? 'bg-emerald-100' : ''
                              } ${columns.includes(suggestion) ? 'text-emerald-700 font-medium' : 'text-gray-700'}`}
                            >
                              {columns.includes(suggestion) ? `📊 ${suggestion}` : suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {columns.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-500 mb-2">Available Variables:</div>
                        <div className="flex flex-wrap gap-1">
                          {columns.slice(0, 12).map((col, idx) => (
                            <button
                              key={idx}
                              onClick={() => setNlDescription(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + col + ' ')}
                              className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200"
                            >
                              {col}
                            </button>
                          ))}
                          {columns.length > 12 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{columns.length - 12} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language & Generate */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ Output Language</h3>
                    <div className="flex gap-3 mb-4">
                      <button onClick={() => setLanguage('Python')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${language === 'Python' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>🐍 Python</button>
                      <button onClick={() => setLanguage('R')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${language === 'R' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>📊 R</button>
                      <button onClick={() => setLanguage('Stata')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${language === 'Stata' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>📈 Stata</button>
                    </div>
                    
                    {error && <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleNLGenerate}
                        disabled={loading || !dataFile || !nlDescription.trim()}
                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {loading ? '⏳ Generating...' : '🚀 Generate Code'}
                      </button>
                      <button
                        onClick={() => { setNlDescription(''); setGeneratedCode(''); setNlExplanation(''); setError(''); }}
                        className="px-6 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-6">
                  {nlExplanation && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Explanation</h3>
                      <div className="bg-emerald-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-emerald-800">{nlExplanation}</div>
                    </div>
                  )}
                  
                  {generatedCode && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">💻 Generated Code</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigator.clipboard.writeText(generatedCode)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                          >
                            Copy
                          </button>
                          <button onClick={handleDownloadCode} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Download</button>
                        </div>
                      </div>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-96">{generatedCode}</pre>
                    </div>
                  )}
                  
                  {!generatedCode && !loading && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Describe Your Analysis</h3>
                      <p className="text-gray-500">
                        Upload your data, describe what analysis you want in plain English, and get ready-to-run code.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : mode === 'pipeline' ? (
          // ========== PIPELINE MODE UI ==========
          <>
            {/* Data Upload for Pipeline */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">📁 Data Source</h3>
                {dataFile && (
                  <span className="text-sm text-gray-500">
                    {dataFile.name} • {pipelineColumns.length} columns • {dataPreview?.totalRows} rows
                  </span>
                )}
              </div>
              {!dataFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="pipeline-upload" />
                  <label htmlFor="pipeline-upload" className="cursor-pointer inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Upload CSV to Start Pipeline
                  </label>
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <span className="text-emerald-600">✅ Data loaded</span>
                  <span className="text-sm text-gray-500">Columns: {pipelineColumns.slice(0, 5).join(', ')}{pipelineColumns.length > 5 ? '...' : ''}</span>
                  <button onClick={handleClear} className="ml-auto text-sm text-red-600 hover:text-red-700">Reset Pipeline</button>
                </div>
              )}
            </div>

            {dataFile && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Pipeline Steps */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">Pipeline Steps</h3>
                      <span className="text-sm text-gray-500">{pipelineSteps.length} steps</span>
                    </div>
                    
                    {pipelineSteps.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No steps yet. Add your first step below.</p>
                    ) : (
                      <div className="space-y-2">
                        {pipelineSteps.map((step, index) => {
                          const stepType = pipelineStepTypes.find(t => t.id === step.type)
                          return (
                            <div key={step.id}
                              onClick={() => selectStep(index)}
                              className={`p-3 rounded-lg cursor-pointer border-2 transition ${
                                currentStepIndex === index ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                              }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{stepType?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {step.status === 'completed' && <span className="text-green-500">✓</span>}
                                  {step.status === 'error' && <span className="text-red-500">✗</span>}
                                  <button onClick={(e) => { e.stopPropagation(); removeStep(index) }} className="text-gray-400 hover:text-red-500">×</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add Step Button */}
                    <button
                      onClick={() => setShowAddStep(true)}
                      className="w-full mt-4 p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                    >
                      + Add Step
                    </button>
                  </div>

                  {/* Export Buttons */}
                  {pipelineSteps.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h4 className="font-bold text-gray-800 mb-3">Export</h4>
                      <div className="space-y-2">
                        <button onClick={exportPipelineReport} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                          📄 Export Report (MD)
                        </button>
                        <button onClick={exportPipelineCode} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
                          💻 Export Code ({language})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generate Robustness Checks Button */}
                  {pipelineSteps.some(s => ['regression', 'did', 'iv'].includes(s.type)) && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <button 
                        onClick={prefillRobustnessFromPipeline}
                        className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
                      >
                        🧪 Generate Robustness Checks
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Based on your regression analysis
                      </p>
                    </div>
                  )}
                </div>

                {/* Current Step Results */}
                <div className="lg:col-span-2">
                  {renderCurrentStepResults()}
                </div>
              </div>
            )}

            {/* Add Step Modal */}
            {showAddStep && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Add Pipeline Step</h3>
                      <button onClick={() => { setShowAddStep(false); setNewStepType(''); setNewStepConfig({}) }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                    </div>

                    {/* Step Type Selection */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Step Type</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {pipelineStepTypes.map(type => (
                          <button key={type.id}
                            onClick={() => { setNewStepType(type.id); setNewStepConfig({}) }}
                            className={`p-3 rounded-lg border-2 text-left transition ${
                              newStepType === type.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                            }`}>
                            <span className="text-sm font-medium">{type.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step Configuration */}
                    {newStepType && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">Configuration</h4>
                        {renderStepConfigForm()}
                      </div>
                    )}

                    {/* Language Selection */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Output Code Language</h4>
                      <div className="flex gap-2">
                        <button onClick={() => setLanguage('Python')} className={`px-4 py-2 rounded-lg ${language === 'Python' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>Python</button>
                        <button onClick={() => setLanguage('R')} className={`px-4 py-2 rounded-lg ${language === 'R' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>R</button>
                      </div>
                    </div>

                    {error && <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">{error}</div>}

                    <button
                      onClick={addPipelineStep}
                      disabled={!newStepType || loading}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50"
                    >
                      {loading ? '⏳ Running...' : '➕ Add Step'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : mode === 'robustness' ? (
          // ========== ROBUSTNESS MODE - TO DO ==========
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Robustness Generator — Coming Soon</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              This feature is under development. It will allow you to generate appendix-ready robustness checks: alternative specifications, subsample tests, placebo tests, and different clustering options.
            </p>
          </div>
        ) : null}
      </main>

      {/* Plot zoom modal */}
      {plotModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPlotModal(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-800">{plotModal.title}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPlot(plotModal.image, plotModal.title)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Download
                </button>
                <button
                  onClick={() => setPlotModal(null)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
            <img
              src={`data:image/png;base64,${plotModal.image}`}
              alt={plotModal.title}
              className="max-w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PolicyAnalyst
