import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function RobustnessGenerator() {
  const navigate = useNavigate()
  const codeFileRef = useRef(null)
  const dataFileRef = useRef(null)
  
  // Input mode: 'manual' or 'code'
  const [inputMode, setInputMode] = useState('code')
  
  // Code upload states
  const [originalCode, setOriginalCode] = useState('')
  const [codeFile, setCodeFile] = useState(null)
  const [dataFile, setDataFile] = useState(null)
  const [dataPreview, setDataPreview] = useState(null)
  const [dataColumns, setDataColumns] = useState([])
  
  // Manual input states
  const [mainSpec, setMainSpec] = useState('')
  const [dependentVar, setDependentVar] = useState('')
  const [independentVars, setIndependentVars] = useState('')
  const [controlVars, setControlVars] = useState('')
  const [fixedEffects, setFixedEffects] = useState('')
  const [clusterVar, setClusterVar] = useState('')
  const [dataDescription, setDataDescription] = useState('')
  const [method, setMethod] = useState('ols')
  const [codeLanguage, setCodeLanguage] = useState('stata')
  
  // Output states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('suggestions')

  const methods = [
    { id: 'ols', name: 'OLS' },
    { id: 'fe', name: 'Fixed Effects' },
    { id: 'did', name: 'Difference-in-Differences' },
    { id: 'iv', name: 'Instrumental Variables' },
    { id: 'rd', name: 'Regression Discontinuity' },
    { id: 'logit', name: 'Logit/Probit' },
  ]

  // Handle code file upload
  const handleCodeFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const validExtensions = ['.r', '.R', '.py', '.do', '.stata', '.txt']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(ext) && ext !== '.r') {
      setError('Please upload a valid code file (.R, .py, .do, .stata, .txt)')
      return
    }
    
    setCodeFile(file)
    setError('')
    
    // Auto-detect language
    if (ext === '.r' || ext === '.R') {
      setCodeLanguage('r')
    } else if (ext === '.py') {
      setCodeLanguage('python')
    } else if (ext === '.do' || ext === '.stata') {
      setCodeLanguage('stata')
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setOriginalCode(event.target.result)
    }
    reader.readAsText(file)
  }

  // Handle data file upload
  const handleDataFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }
    
    setDataFile(file)
    setError('')
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.trim().split('\n')
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        setDataColumns(headers)
        
        // Create preview (first 5 rows)
        const previewRows = lines.slice(0, 6).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        )
        setDataPreview(previewRows)
      }
    }
    reader.readAsText(file)
  }

  // Generate from code
  const handleGenerateFromCode = async () => {
    if (!originalCode.trim()) {
      setError('Please provide your original regression code')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const dataInfo = dataColumns.length > 0 
        ? `\n\nAvailable variables in data: ${dataColumns.join(', ')}`
        : ''

      const prompt = `You are an expert econometrician helping researchers generate robustness and sensitivity checks. 

**Original Regression Code (${codeLanguage}):**
\`\`\`${codeLanguage}
${originalCode}
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
      "stataCode": "Stata code including subsample restriction",
      "rCode": "R code including subsample restriction",
      "pythonCode": "Python code including subsample restriction",
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
      "stataCode": "Stata code with this clustering",
      "rCode": "R code with this clustering",
      "pythonCode": "Python code with this clustering"
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
  
  "latexTableTemplate": "LaTeX code for a robustness table template",
  
  "appendixStructure": "Suggested structure for organizing these checks in an appendix"
}

Make the code realistic and complete. Use the same variable names from the original code. Include necessary data preparation, regression commands with proper options, and output formatting. Use standard packages (reghdfe, estout for Stata; fixest, modelsummary for R; statsmodels, linearmodels for Python).`

      const response = await callChatGPT(prompt)
      const content = response.content

      // Parse JSON from response
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

      setResult(parsed)
    } catch (err) {
      console.error('Generation error:', err)
      if (err.message?.includes('API key')) {
        setError('API key not configured. Please check your settings.')
      } else {
        setError('Failed to generate robustness checks. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!dependentVar.trim() || !independentVars.trim()) {
      setError('Please enter at least dependent and independent variables')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prompt = `You are an expert econometrician helping researchers generate robustness and sensitivity checks for their empirical analysis. Generate comprehensive robustness checks that would go in an appendix.

**Main Specification Details:**
- Dependent Variable: ${dependentVar}
- Main Independent Variable(s): ${independentVars}
- Control Variables: ${controlVars || 'Not specified'}
- Fixed Effects: ${fixedEffects || 'None'}
- Clustering: ${clusterVar || 'Not specified'}
- Method: ${methods.find(m => m.id === method)?.name}
- Data Description: ${dataDescription || 'Not provided'}
${mainSpec ? `- Additional Specification Info: ${mainSpec}` : ''}

Please generate robustness checks in the following JSON format:

{
  "summary": "Brief overview of the robustness testing strategy",
  
  "alternativeSpecs": [
    {
      "name": "Name of the alternative specification",
      "description": "What this tests and why it matters",
      "changes": "What changes from main spec",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code",
      "expectedResult": "What result would support main findings"
    }
  ],
  
  "subsampleTests": [
    {
      "name": "Name of subsample test",
      "description": "Rationale for this subsample",
      "subsampleDefinition": "How to define the subsample",
      "stataCode": "Stata code including subsample restriction",
      "rCode": "R code including subsample restriction",
      "interpretation": "How to interpret results"
    }
  ],
  
  "placeboTests": [
    {
      "name": "Name of placebo test",
      "description": "What this placebo tests",
      "nullHypothesis": "What we expect if main result is valid",
      "stataCode": "Complete Stata code",
      "rCode": "Complete R code"
    }
  ],
  
  "clusteringAlternatives": [
    {
      "name": "Alternative clustering approach",
      "rationale": "Why this clustering might be appropriate",
      "stataCode": "Stata code with this clustering",
      "rCode": "R code with this clustering"
    }
  ],
  
  "additionalChecks": [
    {
      "name": "Additional robustness check",
      "category": "e.g., 'Functional Form', 'Measurement', 'Sample Period'",
      "description": "What this tests",
      "stataCode": "Stata code",
      "rCode": "R code"
    }
  ],
  
  "latexTableTemplate": "LaTeX code for a robustness table template that can hold multiple specifications",
  
  "appendixStructure": "Suggested structure for organizing these checks in an appendix"
}

Make the code realistic and complete - include necessary data preparation, regression commands with proper options, and output formatting. Use standard packages (reghdfe, estout for Stata; fixest, modelsummary for R).`

      const response = await callChatGPT(prompt)
      const content = response.content

      // Parse JSON from response
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
          summary: content,
          alternativeSpecs: [],
          subsampleTests: [],
          placeboTests: [],
          clusteringAlternatives: [],
          additionalChecks: []
        }
      }

      setResult(parsed)
    } catch (err) {
      console.error('Generation error:', err)
      if (err.message?.includes('API key')) {
        setError('API key not configured. Please check your settings.')
      } else {
        setError('Failed to generate robustness checks. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMainSpec('')
    setDependentVar('')
    setIndependentVars('')
    setControlVars('')
    setFixedEffects('')
    setClusterVar('')
    setDataDescription('')
    setOriginalCode('')
    setCodeFile(null)
    setDataFile(null)
    setDataPreview(null)
    setDataColumns([])
    setResult(null)
    setError('')
    if (codeFileRef.current) codeFileRef.current.value = ''
    if (dataFileRef.current) dataFileRef.current.value = ''
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const downloadCode = (code, filename) => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const getAllCode = (type) => {
    if (!result) return ''
    
    let allCode = ''
    const codeKey = type === 'stata' ? 'stataCode' : type === 'r' ? 'rCode' : 'pythonCode'
    const comment = type === 'stata' ? '*' : '#'
    
    allCode += `${comment} ========================================\n`
    allCode += `${comment} ROBUSTNESS AND SENSITIVITY CHECKS\n`
    allCode += `${comment} Generated by AI4ECPP\n`
    allCode += `${comment} ========================================\n\n`

    if (result.alternativeSpecs?.length > 0) {
      allCode += `${comment} --- ALTERNATIVE SPECIFICATIONS ---\n\n`
      result.alternativeSpecs.forEach((spec, idx) => {
        allCode += `${comment} ${idx + 1}. ${spec.name}\n`
        allCode += `${comment} ${spec.description}\n`
        allCode += `${spec[codeKey]}\n\n`
      })
    }

    if (result.subsampleTests?.length > 0) {
      allCode += `${comment} --- SUBSAMPLE TESTS ---\n\n`
      result.subsampleTests.forEach((test, idx) => {
        allCode += `${comment} ${idx + 1}. ${test.name}\n`
        allCode += `${comment} ${test.description}\n`
        allCode += `${test[codeKey]}\n\n`
      })
    }

    if (result.placeboTests?.length > 0) {
      allCode += `${comment} --- PLACEBO TESTS ---\n\n`
      result.placeboTests.forEach((test, idx) => {
        allCode += `${comment} ${idx + 1}. ${test.name}\n`
        allCode += `${comment} ${test.description}\n`
        allCode += `${test[codeKey]}\n\n`
      })
    }

    if (result.clusteringAlternatives?.length > 0) {
      allCode += `${comment} --- ALTERNATIVE CLUSTERING ---\n\n`
      result.clusteringAlternatives.forEach((cluster, idx) => {
        allCode += `${comment} ${idx + 1}. ${cluster.name}\n`
        allCode += `${comment} ${cluster.rationale}\n`
        allCode += `${cluster[codeKey]}\n\n`
      })
    }

    if (result.additionalChecks?.length > 0) {
      allCode += `${comment} --- ADDITIONAL CHECKS ---\n\n`
      result.additionalChecks.forEach((check, idx) => {
        allCode += `${comment} ${idx + 1}. ${check.name} (${check.category})\n`
        allCode += `${comment} ${check.description}\n`
        allCode += `${check[codeKey]}\n\n`
      })
    }

    return allCode
  }

  const renderCodeBlock = (item) => {
    const code = codeLanguage === 'stata' ? item.stataCode : codeLanguage === 'r' ? item.rCode : item.pythonCode
    if (!code) return null
    
    return (
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase">{codeLanguage} Code</span>
          <button
            onClick={() => copyToClipboard(code)}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Copy
          </button>
        </div>
        <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-48">
          {code}
        </pre>
      </div>
    )
  }

  const tabs = [
    { id: 'suggestions', name: 'Overview', icon: '📋' },
    { id: 'altspecs', name: 'Alt. Specs', icon: '🔄' },
    { id: 'subsample', name: 'Subsamples', icon: '📊' },
    { id: 'placebo', name: 'Placebo', icon: '💊' },
    { id: 'clustering', name: 'Clustering', icon: '🔗' },
    { id: 'additional', name: 'Other', icon: '➕' },
    { id: 'export', name: 'Export All', icon: '📤' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profession-dashboard')}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← Back
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Robustness & Sensitivity Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">🧪 Generate Appendix-Ready Robustness Checks</h2>
          <p className="opacity-90">
            Upload your regression code and data, or manually specify your model to get complete robustness tests.
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setInputMode('code')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                inputMode === 'code'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              📄 Upload Code & Data
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                inputMode === 'manual'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              ✏️ Manual Specification
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left Column - Input (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Code Upload Mode */}
            {inputMode === 'code' && (
              <>
                {/* Original Code Input */}
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📄 Original Regression Code</h3>
                  
                  {/* File Upload */}
                  <div className="mb-4">
                    <input
                      type="file"
                      ref={codeFileRef}
                      onChange={handleCodeFileUpload}
                      accept=".r,.R,.py,.do,.stata,.txt"
                      className="hidden"
                      id="code-file-upload"
                    />
                    <label
                      htmlFor="code-file-upload"
                      className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg cursor-pointer hover:bg-teal-700 transition text-sm"
                    >
                      Upload Code File
                    </label>
                    {codeFile && (
                      <span className="ml-3 text-sm text-gray-600">
                        {codeFile.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Or Paste Code */}
                  <div className="text-sm text-gray-500 mb-2">Or paste your code directly:</div>
                  <textarea
                    value={originalCode}
                    onChange={(e) => setOriginalCode(e.target.value)}
                    placeholder={`Paste your regression code here...

Example (Stata):
reghdfe log_wage treatment age education, absorb(state year) cluster(state)

Example (R):
model <- feols(log_wage ~ treatment + age + education | state + year, data = df, cluster = ~state)

Example (Python):
model = PanelOLS.from_formula('log_wage ~ treatment + age + education + EntityEffects + TimeEffects', data=df)
result = model.fit(cov_type='clustered', cluster_entity=True)`}
                    className="w-full h-48 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                {/* Data Upload */}
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Data File (Optional)</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Upload your CSV data to help generate more accurate variable names.
                  </p>
                  
                  <input
                    type="file"
                    ref={dataFileRef}
                    onChange={handleDataFileUpload}
                    accept=".csv"
                    className="hidden"
                    id="data-file-upload"
                  />
                  <label
                    htmlFor="data-file-upload"
                    className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition text-sm"
                  >
                    Upload CSV Data
                  </label>
                  {dataFile && (
                    <span className="ml-3 text-sm text-gray-600">
                      {dataFile.name}
                    </span>
                  )}
                  
                  {/* Data Preview */}
                  {dataPreview && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Variables: {dataColumns.length}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {dataColumns.slice(0, 20).map((col, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">
                            {col}
                          </span>
                        ))}
                        {dataColumns.length > 20 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                            +{dataColumns.length - 20} more
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="text-xs border">
                          <thead>
                            <tr className="bg-gray-50">
                              {dataPreview[0]?.slice(0, 6).map((header, idx) => (
                                <th key={idx} className="px-2 py-1 border text-left">{header}</th>
                              ))}
                              {dataPreview[0]?.length > 6 && <th className="px-2 py-1 border">...</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {dataPreview.slice(1, 4).map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.slice(0, 6).map((cell, cellIdx) => (
                                  <td key={cellIdx} className="px-2 py-1 border">{cell}</td>
                                ))}
                                {row.length > 6 && <td className="px-2 py-1 border">...</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Code Language & Actions */}
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setCodeLanguage('stata')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'stata'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Stata
                    </button>
                    <button
                      onClick={() => setCodeLanguage('r')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'r'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      R
                    </button>
                    <button
                      onClick={() => setCodeLanguage('python')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'python'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Python
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateFromCode}
                      disabled={loading || !originalCode.trim()}
                      className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        '🧪 Generate Checks'
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-4 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Manual Mode */}
            {inputMode === 'manual' && (
              <>
                {/* Main Variables */}
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Main Specification</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dependent Variable (Y) *
                      </label>
                      <input
                        type="text"
                        value={dependentVar}
                        onChange={(e) => setDependentVar(e.target.value)}
                        placeholder="e.g., log_wage, employment"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Main Independent Variable(s) *
                      </label>
                      <input
                        type="text"
                        value={independentVars}
                        onChange={(e) => setIndependentVars(e.target.value)}
                        placeholder="e.g., treatment, min_wage"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Control Variables
                      </label>
                      <input
                        type="text"
                        value={controlVars}
                        onChange={(e) => setControlVars(e.target.value)}
                        placeholder="e.g., age, education, experience"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fixed Effects
                      </label>
                      <input
                        type="text"
                        value={fixedEffects}
                        onChange={(e) => setFixedEffects(e.target.value)}
                        placeholder="e.g., state, year, state#year"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cluster Variable
                      </label>
                      <input
                        type="text"
                        value={clusterVar}
                        onChange={(e) => setClusterVar(e.target.value)}
                        placeholder="e.g., state, firm_id"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Method & Data */}
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ Method & Data</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {methods.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setMethod(m.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                              method === m.id
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Description (Optional)
                      </label>
                      <textarea
                        value={dataDescription}
                        onChange={(e) => setDataDescription(e.target.value)}
                        placeholder="e.g., Panel data 2000-2020, 50 states, quarterly. Treatment starts 2010 in some states."
                        className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Spec Details (Optional)
                      </label>
                      <textarea
                        value={mainSpec}
                        onChange={(e) => setMainSpec(e.target.value)}
                        placeholder="Any other details about your main specification..."
                        className="w-full px-3 py-2 border rounded-lg text-sm h-16 resize-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Code Language & Actions */}
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setCodeLanguage('stata')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'stata'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Stata
                    </button>
                    <button
                      onClick={() => setCodeLanguage('r')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'r'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      R
                    </button>
                    <button
                      onClick={() => setCodeLanguage('python')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                        codeLanguage === 'python'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Python
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !dependentVar.trim() || !independentVars.trim()}
                      className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        '🧪 Generate Checks'
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-4 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Results (3 cols) */}
          <div className="lg:col-span-3">
            {result ? (
              <div className="bg-white rounded-lg shadow">
                {/* Tabs */}
                <div className="border-b overflow-x-auto">
                  <div className="flex">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                          activeTab === tab.id
                            ? 'border-b-2 border-teal-500 text-teal-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.icon} {tab.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  {activeTab === 'suggestions' && (
                    <div className="space-y-4">
                      {/* Code Analysis Results (for code upload mode) */}
                      {result.codeAnalysis && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                          <h4 className="font-bold text-indigo-800 mb-3">🔍 Detected Specification</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-indigo-600 font-medium">Dependent Variable:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.dependentVar || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-medium">Main Independent Var:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.mainIndepVar || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-medium">Controls:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.controls || 'None'}</div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-medium">Fixed Effects:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.fixedEffects || 'None'}</div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-medium">Clustering:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.clustering || 'None'}</div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-medium">Method:</span>
                              <div className="text-indigo-900">{result.codeAnalysis.method || 'Unknown'}</div>
                            </div>
                          </div>
                          {result.codeAnalysis.summary && (
                            <div className="mt-3 pt-3 border-t border-indigo-200">
                              <span className="text-indigo-600 font-medium">Summary:</span>
                              <p className="text-indigo-800 text-sm mt-1">{result.codeAnalysis.summary}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-teal-50 p-4 rounded-lg">
                        <h4 className="font-bold text-teal-800 mb-2">Strategy Overview</h4>
                        <p className="text-teal-700">{result.summary}</p>
                      </div>
                      
                      {result.appendixStructure && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-gray-800 mb-2">Suggested Appendix Structure</h4>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{result.appendixStructure}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{result.alternativeSpecs?.length || 0}</div>
                          <div className="text-sm text-blue-700">Alt. Specifications</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{result.subsampleTests?.length || 0}</div>
                          <div className="text-sm text-purple-700">Subsample Tests</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{result.placeboTests?.length || 0}</div>
                          <div className="text-sm text-orange-700">Placebo Tests</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{result.clusteringAlternatives?.length || 0}</div>
                          <div className="text-sm text-green-700">Clustering Options</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'altspecs' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Alternative Specifications</h4>
                      {result.alternativeSpecs?.map((spec, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="font-medium text-gray-800 mb-1">{idx + 1}. {spec.name}</div>
                          <p className="text-sm text-gray-600 mb-2">{spec.description}</p>
                          <div className="text-xs text-teal-600 mb-2">Changes: {spec.changes}</div>
                          {spec.expectedResult && (
                            <div className="text-xs text-gray-500 mb-2">Expected: {spec.expectedResult}</div>
                          )}
                          {renderCodeBlock(spec)}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'subsample' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Subsample Tests</h4>
                      {result.subsampleTests?.map((test, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="font-medium text-gray-800 mb-1">{idx + 1}. {test.name}</div>
                          <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                          <div className="text-xs text-purple-600 mb-2">Subsample: {test.subsampleDefinition}</div>
                          {test.interpretation && (
                            <div className="text-xs text-gray-500 mb-2">Interpretation: {test.interpretation}</div>
                          )}
                          {renderCodeBlock(test)}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'placebo' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Placebo Tests</h4>
                      {result.placeboTests?.map((test, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="font-medium text-gray-800 mb-1">{idx + 1}. {test.name}</div>
                          <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                          <div className="text-xs text-orange-600 mb-2">Null Hypothesis: {test.nullHypothesis}</div>
                          {renderCodeBlock(test)}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'clustering' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Alternative Clustering</h4>
                      {result.clusteringAlternatives?.map((cluster, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="font-medium text-gray-800 mb-1">{idx + 1}. {cluster.name}</div>
                          <p className="text-sm text-gray-600 mb-2">{cluster.rationale}</p>
                          {renderCodeBlock(cluster)}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'additional' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Additional Checks</h4>
                      {result.additionalChecks?.map((check, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{idx + 1}. {check.name}</span>
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{check.category}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{check.description}</p>
                          {renderCodeBlock(check)}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800">Export All</h4>
                      
                      {/* Download Buttons */}
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => downloadCode(getAllCode('stata'), 'robustness_checks.do')}
                          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"
                        >
                          <div className="text-2xl mb-1">📄</div>
                          <div className="font-medium text-blue-700">Stata (.do)</div>
                        </button>
                        <button
                          onClick={() => downloadCode(getAllCode('r'), 'robustness_checks.R')}
                          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"
                        >
                          <div className="text-2xl mb-1">📄</div>
                          <div className="font-medium text-green-700">R (.R)</div>
                        </button>
                        <button
                          onClick={() => downloadCode(getAllCode('python'), 'robustness_checks.py')}
                          className="p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition"
                        >
                          <div className="text-2xl mb-1">📄</div>
                          <div className="font-medium text-yellow-700">Python (.py)</div>
                        </button>
                      </div>

                      {/* LaTeX Template */}
                      {result.latexTableTemplate && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-gray-700">LaTeX Table Template</h5>
                            <button
                              onClick={() => copyToClipboard(result.latexTableTemplate)}
                              className="text-sm text-teal-600 hover:text-teal-700"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-yellow-300 p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                            {result.latexTableTemplate}
                          </pre>
                        </div>
                      )}

                      {/* Preview All Code */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-700">All {codeLanguage.toUpperCase()} Code</h5>
                          <button
                            onClick={() => copyToClipboard(getAllCode(codeLanguage))}
                            className="text-sm text-teal-600 hover:text-teal-700"
                          >
                            Copy All
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-96">
                          {getAllCode(codeLanguage)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🧪</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Robustness Checks Will Appear Here
                </h3>
                <p className="text-gray-500">
                  Enter your main specification details and click "Generate Checks" to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default RobustnessGenerator
