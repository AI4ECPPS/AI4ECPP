import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../utils/api'

function PolicyDLAgent() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const rewardFileRef = useRef(null)
  
  // Mode: 'train', 'optimize', 'predict', 'scenario'
  const [mode, setMode] = useState('train')
  
  // Data type: 'panel' or 'cross_section'
  const [dataType, setDataType] = useState('panel')
  
  // Data states
  const [dataFile, setDataFile] = useState(null)
  const [dataPreview, setDataPreview] = useState(null)
  const [columns, setColumns] = useState([])
  const [rawData, setRawData] = useState('')
  
  // Variable configuration
  const [entityCol, setEntityCol] = useState('')
  const [timeCol, setTimeCol] = useState('')
  const [featureCols, setFeatureCols] = useState([])
  const [targetCols, setTargetCols] = useState([])
  const [policyFeatures, setPolicyFeatures] = useState([])
  
  // Model parameters
  const [modelParams, setModelParams] = useState({
    dModel: 128,
    numHeads: 8,
    numLayers: 4,
    dFf: 512,
    dropout: 0.1,
    learningRate: 0.0001,
    batchSize: 32,
    epochs: 100,
    lookback: 5,
    predHorizon: 1
  })
  
  // Model params edit mode: 'ui' or 'python'
  const [paramsEditMode, setParamsEditMode] = useState('ui')
  const [paramsCode, setParamsCode] = useState('')
  const [paramsCodeError, setParamsCodeError] = useState('')
  
  // Reward function
  const [rewardCode, setRewardCode] = useState(`import numpy as np

def compute_reward(predictions, actual, context):
    """
    Custom reward function for policy optimization.
    
    Args:
        predictions: dict mapping target names to predicted values
        actual: dict of actual values (may be empty during optimization)
        context: additional context data
    
    Returns:
        float: reward value (higher is better)
    """
    # Example: maximize GDP growth while minimizing unemployment
    # Modify this based on your target variables
    
    reward = 0.0
    
    # Add your reward logic here
    # Example:
    # if 'gdp_growth' in predictions:
    #     reward += predictions['gdp_growth'] * 0.5
    # if 'unemployment' in predictions:
    #     reward -= predictions['unemployment'] * 0.3
    
    for key, value in predictions.items():
        reward += value  # Simple sum as default
    
    return reward
`)
  
  // Policy parameter bounds
  const [policyBounds, setPolicyBounds] = useState({})
  
  // Optimization settings
  const [optimizationMethod, setOptimizationMethod] = useState('differential_evolution')
  const [maxIterations, setMaxIterations] = useState(100)
  
  // Scenario analysis
  const [scenarios, setScenarios] = useState([
    { name: 'Scenario 1', modifications: {} }
  ])
  
  // Results states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modelState, setModelState] = useState(null)
  const [trainingResult, setTrainingResult] = useState(null)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [scenarioResult, setScenarioResult] = useState(null)
  
  // Tabs for results
  const [activeResultTab, setActiveResultTab] = useState('metrics')
  
  // Image modal state
  const [enlargedImage, setEnlargedImage] = useState(null)

  // Parse CSV file
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

    if (file.size > 100 * 1024 * 1024) {
      setError('File size should be less than 100MB')
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
        
        // Auto-detect entity and time columns
        const lowerHeaders = headers.map(h => h.toLowerCase())
        const entityKeywords = ['entity', 'id', 'country', 'state', 'region', 'firm', 'company']
        const timeKeywords = ['time', 'year', 'date', 'period', 'quarter', 'month']
        
        entityKeywords.some(keyword => {
          const idx = lowerHeaders.findIndex(h => h.includes(keyword))
          if (idx !== -1) {
            setEntityCol(headers[idx])
            return true
          }
          return false
        })
        
        timeKeywords.some(keyword => {
          const idx = lowerHeaders.findIndex(h => h.includes(keyword))
          if (idx !== -1) {
            setTimeCol(headers[idx])
            return true
          }
          return false
        })
        
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

  // Handle reward function file upload
  const handleRewardUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.py')) {
      setError('Please upload a Python (.py) file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setRewardCode(event.target.result)
    }
    reader.readAsText(file)
  }

  const resetResults = () => {
    setTrainingResult(null)
    setOptimizationResult(null)
    setScenarioResult(null)
  }

  // Toggle feature selection
  const toggleFeatureCol = (col) => {
    if (col === entityCol || col === timeCol) return
    setFeatureCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const toggleTargetCol = (col) => {
    if (col === entityCol || col === timeCol) return
    setTargetCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const togglePolicyFeature = (col) => {
    setPolicyFeatures(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  // Update policy bounds
  const updatePolicyBound = (feature, type, value) => {
    setPolicyBounds(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [type]: parseFloat(value) || 0
      }
    }))
  }

  // Handle training
  const handleTrain = async () => {
    if (!rawData) {
      setError('Please upload data first')
      return
    }
    if (dataType === 'panel' && (!entityCol || !timeCol)) {
      setError('Panel data requires entity and time columns. Please select them.')
      return
    }
    if (featureCols.length === 0) {
      setError('Please select at least one feature column')
      return
    }
    if (targetCols.length === 0) {
      setError('Please select at least one target column')
      return
    }
    
    // Validate model parameters
    if (modelParams.dModel % modelParams.numHeads !== 0) {
      setError(`Model dimension (${modelParams.dModel}) must be divisible by number of heads (${modelParams.numHeads})`)
      return
    }

    setLoading(true)
    setError('')
    resetResults()

    try {
      const response = await api.post('/policy-dl-agent/train', {
        data: rawData,
        dataType,
        entityCol: dataType === 'panel' ? entityCol : (entityCol || null),
        timeCol: dataType === 'panel' ? timeCol : null,
        featureCols,
        targetCols,
        ...modelParams,
        // For cross-sectional data, set lookback and predHorizon to 1
        lookback: dataType === 'panel' ? modelParams.lookback : 1,
        predHorizon: dataType === 'panel' ? modelParams.predHorizon : 1
      })

      if (response.data.success) {
        setTrainingResult(response.data)
        setModelState(response.data.modelState)
      } else {
        setError(response.data.error || 'Training failed')
      }
    } catch (err) {
      console.error('Training error:', err)
      const errorMsg = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Training failed'
      const traceback = err.response?.data?.traceback
      setError(traceback ? `${errorMsg}\n\nDetails: ${traceback.substring(0, 500)}` : errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Handle optimization
  const handleOptimize = async () => {
    if (!modelState) {
      setError('Please train a model first')
      return
    }
    if (policyFeatures.length === 0) {
      setError('Please select policy features to optimize')
      return
    }
    if (!rewardCode) {
      setError('Please provide a reward function')
      return
    }

    setLoading(true)
    setError('')
    setOptimizationResult(null)

    try {
      const response = await api.post('/policy-dl-agent/optimize', {
        modelState,
        rewardCode,
        data: rawData,
        dataType,
        entityCol: dataType === 'panel' ? entityCol : (entityCol || null),
        timeCol: dataType === 'panel' ? timeCol : null,
        featureCols,
        targetCols,
        policyFeatures,
        bounds: policyBounds,
        optimizationMethod,
        maxIterations
      })

      if (response.data.success) {
        setOptimizationResult(response.data)
      } else {
        setError(response.data.error || 'Optimization failed')
      }
    } catch (err) {
      console.error('Optimization error:', err)
      setError(err.response?.data?.message || err.message || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  // Handle scenario analysis
  const handleScenarioAnalysis = async () => {
    if (!modelState) {
      setError('Please train a model first')
      return
    }
    if (scenarios.length === 0) {
      setError('Please define at least one scenario')
      return
    }

    setLoading(true)
    setError('')
    setScenarioResult(null)

    try {
      const scenarioDict = {}
      scenarios.forEach(s => {
        if (s.name && Object.keys(s.modifications).length > 0) {
          scenarioDict[s.name] = s.modifications
        }
      })

      if (Object.keys(scenarioDict).length === 0) {
        setError('Please add modifications to at least one scenario')
        setLoading(false)
        return
      }

      const response = await api.post('/policy-dl-agent/scenario', {
        modelState,
        rewardCode,
        data: rawData,
        dataType,
        entityCol: dataType === 'panel' ? entityCol : (entityCol || null),
        timeCol: dataType === 'panel' ? timeCol : null,
        featureCols,
        targetCols,
        scenarios: scenarioDict
      })

      if (response.data.success) {
        setScenarioResult(response.data)
      } else {
        setError(response.data.error || 'Scenario analysis failed')
      }
    } catch (err) {
      console.error('Scenario analysis error:', err)
      setError(err.response?.data?.message || err.message || 'Scenario analysis failed')
    } finally {
      setLoading(false)
    }
  }

  // Add scenario
  const addScenario = () => {
    setScenarios([...scenarios, { name: `Scenario ${scenarios.length + 1}`, modifications: {} }])
  }

  // Remove scenario
  const removeScenario = (index) => {
    setScenarios(scenarios.filter((_, i) => i !== index))
  }

  // Update scenario
  const updateScenario = (index, field, value) => {
    const updated = [...scenarios]
    updated[index][field] = value
    setScenarios(updated)
  }

  // Update scenario modification
  const updateScenarioModification = (scenarioIndex, feature, value) => {
    const updated = [...scenarios]
    if (value === '' || value === null) {
      delete updated[scenarioIndex].modifications[feature]
    } else {
      updated[scenarioIndex].modifications[feature] = parseFloat(value)
    }
    setScenarios(updated)
  }

  // Clear all
  const handleClear = () => {
    setDataFile(null)
    setDataPreview(null)
    setColumns([])
    setRawData('')
    setEntityCol('')
    setTimeCol('')
    setFeatureCols([])
    setTargetCols([])
    setPolicyFeatures([])
    setPolicyBounds({})
    setModelState(null)
    resetResults()
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Generate Python code from modelParams
  const generateParamsCode = () => {
    return `# Model Parameters Configuration
# Edit the values below and click "Apply" to update

model_params = {
    # Architecture
    'd_model': ${modelParams.dModel},        # Model dimension (embedding size)
    'num_heads': ${modelParams.numHeads},       # Number of attention heads
    'num_layers': ${modelParams.numLayers},       # Number of transformer layers
    'd_ff': ${modelParams.dFf},           # Feed-forward dimension
    'dropout': ${modelParams.dropout},        # Dropout rate
    
    # Training
    'learning_rate': ${modelParams.learningRate},  # Learning rate
    'batch_size': ${modelParams.batchSize},       # Batch size
    'epochs': ${modelParams.epochs},          # Number of training epochs
    
    # Sequence (for panel data)
    'lookback': ${modelParams.lookback},         # Historical time steps to consider
    'pred_horizon': ${modelParams.predHorizon},      # Future time steps to predict
}
`
  }

  // Parse Python code and update modelParams
  const parseParamsCode = (code) => {
    try {
      setParamsCodeError('')
      
      // Extract values using regex
      const extractValue = (key, type = 'int') => {
        const patterns = [
          new RegExp(`['"]${key}['"]\\s*:\\s*([\\d.e-]+)`, 'i'),
          new RegExp(`${key}\\s*[=:]\\s*([\\d.e-]+)`, 'i')
        ]
        for (const pattern of patterns) {
          const match = code.match(pattern)
          if (match) {
            return type === 'float' ? parseFloat(match[1]) : parseInt(match[1])
          }
        }
        return null
      }

      const newParams = {
        dModel: extractValue('d_model') || extractValue('dModel') || modelParams.dModel,
        numHeads: extractValue('num_heads') || extractValue('numHeads') || modelParams.numHeads,
        numLayers: extractValue('num_layers') || extractValue('numLayers') || modelParams.numLayers,
        dFf: extractValue('d_ff') || extractValue('dFf') || modelParams.dFf,
        dropout: extractValue('dropout', 'float') ?? modelParams.dropout,
        learningRate: extractValue('learning_rate', 'float') || extractValue('learningRate', 'float') || modelParams.learningRate,
        batchSize: extractValue('batch_size') || extractValue('batchSize') || modelParams.batchSize,
        epochs: extractValue('epochs') || modelParams.epochs,
        lookback: extractValue('lookback') || modelParams.lookback,
        predHorizon: extractValue('pred_horizon') || extractValue('predHorizon') || modelParams.predHorizon
      }

      // Validate values
      if (newParams.dModel < 16 || newParams.dModel > 2048) {
        throw new Error('d_model should be between 16 and 2048')
      }
      if (newParams.numHeads < 1 || newParams.numHeads > 32) {
        throw new Error('num_heads should be between 1 and 32')
      }
      if (newParams.dModel % newParams.numHeads !== 0) {
        throw new Error(`d_model (${newParams.dModel}) must be divisible by num_heads (${newParams.numHeads})`)
      }
      if (newParams.dropout < 0 || newParams.dropout > 0.9) {
        throw new Error('dropout should be between 0 and 0.9')
      }
      if (newParams.learningRate <= 0 || newParams.learningRate > 1) {
        throw new Error('learning_rate should be between 0 and 1')
      }

      setModelParams(newParams)
      return true
    } catch (err) {
      setParamsCodeError(err.message)
      return false
    }
  }

  // Switch to Python mode
  const switchToParamsCode = () => {
    setParamsCode(generateParamsCode())
    setParamsCodeError('')
    setParamsEditMode('python')
  }

  // Apply Python code changes
  const applyParamsCode = () => {
    if (parseParamsCode(paramsCode)) {
      setParamsEditMode('ui')
    }
  }

  // Render model parameters form
  const renderModelParams = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Model Dim</label>
        <select
          value={modelParams.dModel}
          onChange={(e) => setModelParams({...modelParams, dModel: parseInt(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[64, 128, 256, 512].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {dataType === 'panel' ? 'Attention Heads' : 'Hidden Layers'}
        </label>
        <select
          value={modelParams.numHeads}
          onChange={(e) => setModelParams({...modelParams, numHeads: parseInt(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[2, 4, 8, 16].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Layers</label>
        <select
          value={modelParams.numLayers}
          onChange={(e) => setModelParams({...modelParams, numLayers: parseInt(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[1, 2, 3, 4, 6, 8, 12].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">FF Dim</label>
        <select
          value={modelParams.dFf}
          onChange={(e) => setModelParams({...modelParams, dFf: parseInt(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[256, 512, 1024, 2048].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Dropout</label>
        <select
          value={modelParams.dropout}
          onChange={(e) => setModelParams({...modelParams, dropout: parseFloat(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[0.0, 0.1, 0.2, 0.3, 0.5].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Learning Rate</label>
        <select
          value={modelParams.learningRate}
          onChange={(e) => setModelParams({...modelParams, learningRate: parseFloat(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[0.01, 0.001, 0.0001, 0.00001].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Batch Size</label>
        <select
          value={modelParams.batchSize}
          onChange={(e) => setModelParams({...modelParams, batchSize: parseInt(e.target.value)})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        >
          {[8, 16, 32, 64, 128].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Epochs</label>
        <input
          type="number"
          min="10"
          max="500"
          value={modelParams.epochs}
          onChange={(e) => setModelParams({...modelParams, epochs: parseInt(e.target.value) || 100})}
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        />
      </div>
      {/* Panel data specific: Lookback and Prediction Horizon */}
      {dataType === 'panel' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lookback</label>
            <input
              type="number"
              min="2"
              max="20"
              value={modelParams.lookback}
              onChange={(e) => setModelParams({...modelParams, lookback: parseInt(e.target.value) || 5})}
              className="w-full px-2 py-1.5 text-sm border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pred Horizon</label>
            <input
              type="number"
              min="1"
              max="10"
              value={modelParams.predHorizon}
              onChange={(e) => setModelParams({...modelParams, predHorizon: parseInt(e.target.value) || 1})}
              className="w-full px-2 py-1.5 text-sm border rounded-lg"
            />
          </div>
        </>
      )}
    </div>
  )

  // Render training results
  const renderTrainingResults = () => {
    if (!trainingResult) return null

    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b">
          {['metrics', 'importance', 'plots'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveResultTab(tab)}
              className={`px-4 py-2 text-sm font-medium ${
                activeResultTab === tab 
                  ? 'border-b-2 border-indigo-500 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'metrics' ? 'Metrics' : tab === 'importance' ? 'Feature Importance' : 'Visualizations'}
            </button>
          ))}
        </div>

        {/* Metrics Tab */}
        {activeResultTab === 'metrics' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {trainingResult.testMetrics?.r2?.toFixed(4) || 'N/A'}
              </div>
              <div className="text-sm text-blue-700">R-squared</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {trainingResult.testMetrics?.rmse?.toFixed(4) || 'N/A'}
              </div>
              <div className="text-sm text-green-700">RMSE</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {trainingResult.testMetrics?.mae?.toFixed(4) || 'N/A'}
              </div>
              <div className="text-sm text-purple-700">MAE</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {trainingResult.epochsTrained || 'N/A'}
              </div>
              <div className="text-sm text-orange-700">Epochs Trained</div>
            </div>
          </div>
        )}

        {/* Feature Importance Tab */}
        {activeResultTab === 'importance' && trainingResult.featureImportance && (
          <div className="space-y-2">
            {Object.entries(trainingResult.featureImportance)
              .sort((a, b) => b[1] - a[1])
              .map(([feature, importance]) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600 truncate">{feature}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${importance * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-gray-500 text-right">
                    {(importance * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Plots Tab */}
        {activeResultTab === 'plots' && trainingResult.plots && (
          <div className="grid md:grid-cols-2 gap-4">
            {trainingResult.plots.map((plot, idx) => (
              <div key={idx} className="border rounded-lg p-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{plot.title}</h4>
                <img 
                  src={`data:image/png;base64,${plot.image}`} 
                  alt={plot.title}
                  className="w-full rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => setEnlargedImage({ title: plot.title, image: plot.image })}
                  title="Click to enlarge"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render optimization results
  const renderOptimizationResults = () => {
    if (!optimizationResult) return null

    return (
      <div className="space-y-4">
        {/* Optimal Reward */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">{optimizationResult.optimalReward?.toFixed(4)}</div>
          <div className="text-green-100">Optimal Reward</div>
        </div>

        {/* Optimal Parameters */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-800 mb-3">Optimal Policy Parameters</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(optimizationResult.optimalParams || {}).map(([param, value]) => (
              <div key={param} className="bg-gray-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-indigo-600">{value.toFixed(4)}</div>
                <div className="text-sm text-gray-600">{param}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictions Comparison */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-800 mb-3">Predicted Outcomes</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Target</th>
                  <th className="text-right py-2 px-3">Baseline</th>
                  <th className="text-right py-2 px-3">Optimal</th>
                  <th className="text-right py-2 px-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(optimizationResult.optimalPredictions || {}).map(target => (
                  <tr key={target} className="border-b">
                    <td className="py-2 px-3 font-medium">{target}</td>
                    <td className="py-2 px-3 text-right">
                      {optimizationResult.baselinePredictions?.[target]?.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {optimizationResult.optimalPredictions?.[target]?.toFixed(4)}
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${
                      (optimizationResult.improvement?.[target] || 0) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(optimizationResult.improvement?.[target] || 0) >= 0 ? '+' : ''}
                      {optimizationResult.improvement?.[target]?.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold text-gray-800">Policy DL Agent</h1>
          </div>
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['train', 'optimize', 'scenario'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  mode === m ? 'bg-white shadow text-indigo-600' : 'text-gray-600'
                }`}
              >
                {m === 'train' ? 'Train' : m === 'optimize' ? 'Optimize' : 'Scenarios'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {mode === 'train' ? 'Train Transformer Model' : 
             mode === 'optimize' ? 'Policy Optimization' : 
             'Scenario Analysis'}
          </h2>
          <p className="opacity-90">
            {mode === 'train' 
              ? 'Upload panel data and train a Transformer model to predict socio-economic outcomes.'
              : mode === 'optimize'
              ? 'Define a custom reward function and find optimal policy parameters.'
              : 'Compare different policy scenarios and their predicted outcomes.'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Data Type Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">1. Select Data Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDataType('panel')}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    dataType === 'panel' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-semibold text-gray-800">Panel Data</div>
                  <div className="text-sm text-gray-500">Multiple entities over time (e.g., countries × years)</div>
                </button>
                <button
                  onClick={() => setDataType('cross_section')}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    dataType === 'cross_section' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📈</div>
                  <div className="font-semibold text-gray-800">Cross-Sectional Data</div>
                  <div className="text-sm text-gray-500">Single time point, multiple observations</div>
                </button>
              </div>
            </div>

            {/* Data Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">2. Upload Data</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="data-upload" 
                />
                <label 
                  htmlFor="data-upload" 
                  className="cursor-pointer inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Choose CSV File
                </label>
                {dataFile && <p className="mt-3 text-gray-600">Selected: {dataFile.name}</p>}
              </div>
              {dataPreview && (
                <div className="mt-4 overflow-x-auto border rounded-lg max-h-48">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {dataPreview.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataPreview.data.map((row, i) => (
                        <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                          {dataPreview.headers.map((h, j) => (
                            <td key={j} className="px-3 py-2">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Variable Configuration */}
            {columns.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">3. Configure Variables</h3>
                
                <div className="space-y-4">
                  {/* Panel Data: Entity and Time Columns */}
                  {dataType === 'panel' && (
                    <>
                      {/* Entity Column */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Entity Column (e.g., country, firm)
                        </label>
                        <select
                          value={entityCol}
                          onChange={(e) => setEntityCol(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Select...</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      {/* Time Column */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Column (e.g., year, quarter)
                        </label>
                        <select
                          value={timeCol}
                          onChange={(e) => setTimeCol(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Select...</option>
                          {columns.filter(c => c !== entityCol).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Cross-Sectional Data: Optional ID Column */}
                  {dataType === 'cross_section' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Column (optional, e.g., observation_id)
                      </label>
                      <select
                        value={entityCol}
                        onChange={(e) => setEntityCol(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">None (use row index)</option>
                        {columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Feature Columns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feature Columns (Input Variables)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {columns.filter(c => c !== entityCol && c !== timeCol).map(col => (
                        <button
                          key={col}
                          onClick={() => toggleFeatureCol(col)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            featureCols.includes(col)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Columns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Columns (Variables to Predict)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {columns.filter(c => c !== entityCol && c !== timeCol).map(col => (
                        <button
                          key={col}
                          onClick={() => toggleTargetCol(col)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            targetCols.includes(col)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model Parameters (Train Mode) */}
            {mode === 'train' && columns.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">4. Model Parameters</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setParamsEditMode('ui')}
                      className={`px-3 py-1.5 text-sm rounded-lg transition ${
                        paramsEditMode === 'ui'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      UI Mode
                    </button>
                    <button
                      onClick={switchToParamsCode}
                      className={`px-3 py-1.5 text-sm rounded-lg transition ${
                        paramsEditMode === 'python'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Python Mode
                    </button>
                  </div>
                </div>
                
                {paramsEditMode === 'ui' ? (
                  renderModelParams()
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={paramsCode}
                      onChange={(e) => setParamsCode(e.target.value)}
                      className="w-full h-80 font-mono text-sm p-4 border rounded-lg bg-gray-900 text-green-400"
                      spellCheck="false"
                    />
                    {paramsCodeError && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        Error: {paramsCodeError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={applyParamsCode}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Apply Changes
                      </button>
                      <button
                        onClick={() => {
                          setParamsEditMode('ui')
                          setParamsCodeError('')
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setParamsCode(generateParamsCode())}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Reset to Current
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reward Function (Optimize Mode) */}
            {mode === 'optimize' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">3. Reward Function</h3>
                
                {/* Policy Features Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Parameters (Features to Optimize)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {featureCols.map(col => (
                      <button
                        key={col}
                        onClick={() => togglePolicyFeature(col)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          policyFeatures.includes(col)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bounds for Policy Parameters */}
                {policyFeatures.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parameter Bounds
                    </label>
                    <div className="space-y-2">
                      {policyFeatures.map(pf => (
                        <div key={pf} className="flex items-center gap-2">
                          <span className="w-24 text-sm truncate">{pf}</span>
                          <input
                            type="number"
                            placeholder="Min"
                            value={policyBounds[pf]?.min || ''}
                            onChange={(e) => updatePolicyBound(pf, 'min', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border rounded"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={policyBounds[pf]?.max || ''}
                            onChange={(e) => updatePolicyBound(pf, 'max', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload or Edit Reward Function */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Reward Function Code (Python)
                    </label>
                    <div>
                      <input 
                        ref={rewardFileRef}
                        type="file"
                        accept=".py"
                        onChange={handleRewardUpload}
                        className="hidden"
                        id="reward-upload"
                      />
                      <label 
                        htmlFor="reward-upload"
                        className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Upload .py file
                      </label>
                    </div>
                  </div>
                  <textarea
                    value={rewardCode}
                    onChange={(e) => setRewardCode(e.target.value)}
                    className="w-full h-64 px-3 py-2 text-sm font-mono bg-gray-900 text-green-400 rounded-lg"
                    spellCheck="false"
                  />
                </div>

                {/* Optimization Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                    <select
                      value={optimizationMethod}
                      onChange={(e) => setOptimizationMethod(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    >
                      <option value="differential_evolution">Differential Evolution</option>
                      <option value="L-BFGS-B">L-BFGS-B</option>
                      <option value="SLSQP">SLSQP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Iterations</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={maxIterations}
                      onChange={(e) => setMaxIterations(parseInt(e.target.value) || 100)}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Scenario Configuration */}
            {mode === 'scenario' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">3. Define Scenarios</h3>
                
                <div className="space-y-4">
                  {scenarios.map((scenario, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <input
                          type="text"
                          value={scenario.name}
                          onChange={(e) => updateScenario(idx, 'name', e.target.value)}
                          className="font-medium text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none"
                        />
                        {scenarios.length > 1 && (
                          <button
                            onClick={() => removeScenario(idx)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {featureCols.map(feature => (
                          <div key={feature} className="flex items-center gap-2">
                            <span className="w-32 text-sm text-gray-600 truncate">{feature}</span>
                            <input
                              type="number"
                              placeholder="Value"
                              value={scenario.modifications[feature] ?? ''}
                              onChange={(e) => updateScenarioModification(idx, feature, e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addScenario}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500"
                  >
                    + Add Scenario
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-3">
                <button
                  onClick={mode === 'train' ? handleTrain : mode === 'optimize' ? handleOptimize : handleScenarioAnalysis}
                  disabled={loading || !dataFile}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-indigo-700 transition"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : mode === 'train' ? 'Train Model' : mode === 'optimize' ? 'Optimize' : 'Analyze Scenarios'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Clear
                </button>
              </div>
              
              {modelState && (
                <div className="mt-3 text-sm text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Model trained and ready for optimization
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Training Results */}
            {mode === 'train' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Training Results</h3>
                {trainingResult ? (
                  renderTrainingResults()
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🧠</div>
                    <h4 className="text-xl font-semibold text-gray-700">Results Will Appear Here</h4>
                    <p className="text-gray-500 mt-2">Configure your data and click "Train Model"</p>
                  </div>
                )}
              </div>
            )}

            {/* Optimization Results */}
            {mode === 'optimize' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Optimization Results</h3>
                {optimizationResult ? (
                  renderOptimizationResults()
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h4 className="text-xl font-semibold text-gray-700">Optimal Policy Will Appear Here</h4>
                    <p className="text-gray-500 mt-2">
                      {modelState 
                        ? 'Define your reward function and click "Optimize"'
                        : 'Train a model first, then define your reward function'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Scenario Results */}
            {mode === 'scenario' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Scenario Comparison</h3>
                {scenarioResult ? (
                  <div className="space-y-4">
                    {Object.entries(scenarioResult.scenarios || {}).map(([name, data]) => (
                      <div key={name} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-800">{name}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            data.reward >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            Reward: {data.reward?.toFixed(4)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(data.predictions || {}).map(([target, pred]) => (
                            <div key={target} className="bg-gray-50 rounded p-2">
                              <div className="text-sm font-medium text-gray-600">{target}</div>
                              <div className="text-lg font-semibold text-indigo-600">
                                {pred.mean?.toFixed(4)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h4 className="text-xl font-semibold text-gray-700">Scenario Analysis Will Appear Here</h4>
                    <p className="text-gray-500 mt-2">
                      {modelState 
                        ? 'Define scenarios and click "Analyze Scenarios"'
                        : 'Train a model first, then define your scenarios'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">{enlargedImage.title}</h3>
              <button 
                onClick={() => setEnlargedImage(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img 
                src={`data:image/png;base64,${enlargedImage.image}`} 
                alt={enlargedImage.title}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PolicyDLAgent
