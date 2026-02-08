import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function NLAnalyst() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  
  const [dataFile, setDataFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [dataPreview, setDataPreview] = useState(null)
  const [analysisDescription, setAnalysisDescription] = useState('')
  const [language, setLanguage] = useState('Python')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [explanation, setExplanation] = useState('')
  
  // Autocomplete states
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Predefined method/keyword suggestions
  const methodKeywords = [
    // Regression types
    'regression', 'OLS', 'linear regression', 'logistic regression', 'logit', 'probit',
    'fixed effects', 'random effects', 'panel data', 'two-way fixed effects',
    'instrumental variables', 'IV', '2SLS', 'difference-in-differences', 'DID',
    'regression discontinuity', 'RD', 'RDD',
    // Time series
    'time series', 'ARIMA', 'VAR', 'VECM', 'ADF test', 'stationarity', 'cointegration',
    'autocorrelation', 'ACF', 'PACF', 'Granger causality',
    // Statistical tests
    't-test', 'F-test', 'chi-square', 'ANOVA', 'correlation', 'heteroskedasticity',
    'Breusch-Pagan', 'White test', 'VIF', 'multicollinearity',
    // Transformations
    'log transform', 'standardize', 'normalize', 'dummy variable', 'interaction term',
    'quadratic', 'polynomial', 'lag variable', 'first difference',
    // Specifications
    'robust standard errors', 'clustered standard errors', 'bootstrap',
    'dependent variable', 'independent variable', 'control variable',
    'treatment', 'outcome', 'covariates',
    // Visualization
    'scatter plot', 'histogram', 'residual plot', 'fitted values', 'coefficient plot',
    'confidence interval', 'prediction interval',
    // Output
    'summary statistics', 'descriptive statistics', 'regression table', 'stargazer'
  ]

  // Get current word being typed
  const getCurrentWord = useCallback((text, position) => {
    const beforeCursor = text.slice(0, position)
    const match = beforeCursor.match(/[\w-]+$/)
    return match ? match[0] : ''
  }, [])

  // Filter suggestions based on current word
  const getFilteredSuggestions = useCallback((currentWord) => {
    if (!currentWord || currentWord.length < 2) return []
    
    const lowerWord = currentWord.toLowerCase()
    const allSuggestions = [...columns, ...methodKeywords]
    
    // Filter and sort: exact prefix matches first, then contains matches
    const matches = allSuggestions.filter(s => 
      s.toLowerCase().includes(lowerWord) && s.toLowerCase() !== lowerWord
    )
    
    // Sort: prefix matches first
    matches.sort((a, b) => {
      const aStartsWith = a.toLowerCase().startsWith(lowerWord)
      const bStartsWith = b.toLowerCase().startsWith(lowerWord)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.length - b.length
    })
    
    return matches.slice(0, 8) // Limit to 8 suggestions
  }, [columns])

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value
    const newPosition = e.target.selectionStart
    
    setAnalysisDescription(newText)
    setCursorPosition(newPosition)
    
    const currentWord = getCurrentWord(newText, newPosition)
    const filtered = getFilteredSuggestions(currentWord)
    
    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedSuggestionIndex(0)
  }

  // Insert suggestion
  const insertSuggestion = useCallback((suggestion) => {
    const text = analysisDescription
    const position = cursorPosition
    const currentWord = getCurrentWord(text, position)
    
    const beforeWord = text.slice(0, position - currentWord.length)
    const afterCursor = text.slice(position)
    
    const newText = beforeWord + suggestion + ' ' + afterCursor
    const newPosition = beforeWord.length + suggestion.length + 1
    
    setAnalysisDescription(newText)
    setCursorPosition(newPosition)
    setShowSuggestions(false)
    setSuggestions([])
    
    // Focus back on textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }, [analysisDescription, cursorPosition, getCurrentWord])

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      insertSuggestion(suggestions[selectedSuggestionIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      )
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0])
    const data = []
    
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = parseCSVLine(lines[i])
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }

    return { headers, data, totalRows: lines.length - 1 }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setDataFile(file)
    setError('')
    setGeneratedCode('')
    setExplanation('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const { headers, data, totalRows } = parseCSV(text)
        setColumns(headers)
        setDataPreview({ headers, data, totalRows })
      } catch (err) {
        setError(`Failed to parse CSV file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  const handleGenerate = async () => {
    if (!dataFile || !analysisDescription.trim()) {
      setError('Please upload a CSV file and describe your analysis')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedCode('')
    setExplanation('')

    try {
      const prompt = `You are an expert econometrician and data analyst. A user has uploaded a CSV dataset and wants to perform an empirical analysis.

## Dataset Information
- **File name**: ${dataFile.name}
- **Columns**: ${columns.join(', ')}
- **Number of rows**: ${dataPreview?.totalRows || 'unknown'}
- **Sample data** (first few rows):
${JSON.stringify(dataPreview?.data?.slice(0, 3), null, 2)}

## User's Analysis Request
"${analysisDescription}"

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

      // Try to parse JSON response
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim()
        }
        
        const parsed = JSON.parse(jsonStr)
        setGeneratedCode(parsed.code || '')
        setExplanation(`${parsed.explanation || ''}\n\n**Method Notes:** ${parsed.methodNotes || ''}`)
      } catch {
        // If JSON parsing fails, try to extract code block
        const codeMatch = content.match(/```(?:python|r|stata)?\s*([\s\S]*?)```/)
        if (codeMatch) {
          setGeneratedCode(codeMatch[1].trim())
          setExplanation('Code generated based on your description.')
        } else {
          setGeneratedCode(content)
          setExplanation('Code generated based on your description.')
        }
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCode = () => {
    if (!generatedCode) return
    
    const extensions = { Python: 'py', R: 'R', Stata: 'do' }
    const ext = extensions[language] || 'txt'
    
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyCode = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
  }

  const handleClear = () => {
    setDataFile(null)
    setColumns([])
    setDataPreview(null)
    setAnalysisDescription('')
    setGeneratedCode('')
    setExplanation('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Natural Language Empirical Analyst</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-xl font-bold mb-2">Describe Your Analysis in Plain English</h2>
          <p className="opacity-90">
            Upload your CSV data and tell us what analysis you want to perform. 
            We'll generate complete, ready-to-run code in your preferred language.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Data Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Step 1: Upload Data</h3>
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
                  className="cursor-pointer inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >
                  Choose CSV File
                </label>
                {dataFile && (
                  <p className="mt-3 text-gray-600">✅ {dataFile.name}</p>
                )}
              </div>

              {dataPreview && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Columns:</strong> {columns.join(', ')}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Rows:</strong> {dataPreview.totalRows}
                  </p>
                  <div className="overflow-x-auto border rounded-lg max-h-40">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {dataPreview.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataPreview.data.map((row, i) => (
                          <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                            {dataPreview.headers.map((h, j) => (
                              <td key={j} className="px-3 py-2 text-xs">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Step 2: Describe Your Analysis</h3>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={analysisDescription}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Example: Run a regression with income as the dependent variable and education, age, and gender as independent variables. Include robust standard errors and show a scatter plot of income vs education."
                  className="w-full h-40 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        onClick={() => insertSuggestion(suggestion)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 flex items-center justify-between ${
                          index === selectedSuggestionIndex ? 'bg-amber-100' : ''
                        }`}
                      >
                        <span>
                          {columns.includes(suggestion) ? (
                            <span className="text-emerald-600 font-medium">{suggestion}</span>
                          ) : (
                            <span className="text-gray-700">{suggestion}</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {columns.includes(suggestion) ? 'variable' : 'keyword'}
                        </span>
                      </button>
                    ))}
                    <div className="px-4 py-2 text-xs text-gray-400 border-t bg-gray-50">
                      Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Tab</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Enter</kbd> to insert • <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">↑↓</kbd> to navigate
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Be specific about: dependent/independent variables, analysis type (OLS, logit, fixed effects, etc.), 
                any transformations, visualizations, or special requirements.
                {columns.length > 0 && (
                  <span className="text-emerald-600 ml-1">
                    • Variable names from your data will appear in autocomplete
                  </span>
                )}
              </p>
            </div>

            {/* Language Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Step 3: Choose Language</h3>
              <div className="flex gap-3">
                {['Python', 'R', 'Stata'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      language === lang 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || !dataFile || !analysisDescription.trim()}
                className="flex-1 px-6 py-4 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '⏳ Generating Code...' : '✨ Generate Code'}
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Output */}
          <div className="space-y-6">
            {generatedCode ? (
              <>
                {/* Explanation */}
                {explanation && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">Analysis Overview</h3>
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {explanation}
                    </div>
                  </div>
                )}

                {/* Generated Code */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Generated {language} Code</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyCode}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={handleDownloadCode}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition"
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-[600px] whitespace-pre-wrap">
                    {generatedCode}
                  </pre>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your Code Will Appear Here</h3>
                <p className="text-gray-500">
                  Upload your data, describe your analysis, and click "Generate Code"
                </p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-amber-50 rounded-lg p-6">
              <h4 className="font-semibold text-amber-800 mb-3">Tips for Better Results</h4>
              <ul className="text-sm text-amber-700 space-y-2">
                <li>• <strong>Be specific</strong> about variable names from your dataset</li>
                <li>• Mention the <strong>type of analysis</strong>: OLS, logit, probit, fixed effects, etc.</li>
                <li>• Specify any <strong>transformations</strong>: log, standardize, create dummies</li>
                <li>• Request specific <strong>diagnostics</strong>: heteroskedasticity tests, VIF, etc.</li>
                <li>• Ask for <strong>visualizations</strong>: scatter plots, residual plots, etc.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NLAnalyst
