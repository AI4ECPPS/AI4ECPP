import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function CodingHelper() {
  const navigate = useNavigate()
  
  // Input states
  const [code, setCode] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('python')
  const [targetLanguage, setTargetLanguage] = useState('r')
  const [activeTab, setActiveTab] = useState('annotate') // 'annotate', 'suggest', 'convert'
  
  // Output states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const languages = [
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'r', name: 'R', icon: '📊' },
    { id: 'stata', name: 'Stata', icon: '📈' }
  ]

  const getLanguageName = (id) => {
    return languages.find(l => l.id === id)?.name || id
  }

  const handleAnnotate = async () => {
    if (!code.trim()) {
      setError('Please enter your code')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prompt = `You are an expert programmer specializing in ${getLanguageName(sourceLanguage)} for data analysis and econometrics.

## Task: Provide line-by-line annotations for the following code

## Code (${getLanguageName(sourceLanguage)}):
\`\`\`${sourceLanguage}
${code}
\`\`\`

## Instructions:
1. For each meaningful line or code block, provide a clear explanation
2. Explain what the code does, not just restate it
3. Highlight any data manipulation, statistical operations, or modeling steps
4. Note any assumptions or potential issues
5. Use language appropriate for economics/policy research context

## Response Format:
Please return a JSON object with the following structure:
{
  "annotatedCode": [
    {
      "lineNumbers": "1-3",
      "code": "the original code",
      "annotation": "explanation of what this code does"
    }
  ],
  "summary": "A brief overall summary of what this code accomplishes",
  "keyOperations": ["list of key operations performed"]
}

Return ONLY valid JSON, no additional text.`

      const systemMessage = `You are a senior data scientist and economist with expertise in ${getLanguageName(sourceLanguage)}. You excel at explaining code clearly for both technical and non-technical audiences. Always respond with valid JSON only.`

      const response = await callChatGPT(prompt, systemMessage)
      
      let parsed = parseJSONResponse(response.content)
      if (parsed) {
        setResult({ type: 'annotate', data: parsed })
      } else {
        setResult({ type: 'annotate', raw: response.content })
      }

    } catch (err) {
      console.error('Error annotating code:', err)
      setError('Failed to annotate code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggest = async () => {
    if (!code.trim()) {
      setError('Please enter your code')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prompt = `You are an expert programmer specializing in ${getLanguageName(sourceLanguage)} for data analysis and econometrics.

## Task: Review the following code and provide improvement suggestions

## Code (${getLanguageName(sourceLanguage)}):
\`\`\`${sourceLanguage}
${code}
\`\`\`

## Instructions:
Analyze this code and provide suggestions for:
1. **Code Quality**: Readability, maintainability, naming conventions
2. **Performance**: Efficiency improvements, vectorization opportunities
3. **Best Practices**: Following ${getLanguageName(sourceLanguage)} idioms and conventions
4. **Error Handling**: Potential bugs, edge cases, error handling
5. **Documentation**: Missing comments or documentation needs
6. **Statistical/Econometric**: Any methodological concerns for research use

## Response Format:
Please return a JSON object with the following structure:
{
  "overallAssessment": "Brief overall assessment of the code quality",
  "suggestions": [
    {
      "category": "Category name",
      "severity": "high/medium/low",
      "issue": "Description of the issue",
      "suggestion": "How to improve",
      "codeExample": "Optional: improved code snippet"
    }
  ],
  "improvedCode": "The full improved version of the code with all suggestions applied",
  "summary": "Summary of main improvements"
}

Return ONLY valid JSON, no additional text.`

      const systemMessage = `You are a senior code reviewer and data scientist with expertise in ${getLanguageName(sourceLanguage)}. You provide constructive, actionable feedback focused on improving code quality and research reproducibility. Always respond with valid JSON only.`

      const response = await callChatGPT(prompt, systemMessage)
      
      let parsed = parseJSONResponse(response.content)
      if (parsed) {
        setResult({ type: 'suggest', data: parsed })
      } else {
        setResult({ type: 'suggest', raw: response.content })
      }

    } catch (err) {
      console.error('Error suggesting improvements:', err)
      setError('Failed to analyze code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (!code.trim()) {
      setError('Please enter your code')
      return
    }

    if (sourceLanguage === targetLanguage) {
      setError('Source and target languages must be different')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prompt = `You are an expert programmer who specializes in converting code between ${getLanguageName(sourceLanguage)}, R, Python, and Stata for data analysis and econometrics.

## Task: Convert the following code from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguage)}

## Original Code (${getLanguageName(sourceLanguage)}):
\`\`\`${sourceLanguage}
${code}
\`\`\`

## Instructions:
1. Convert the code to ${getLanguageName(targetLanguage)}, maintaining the same functionality
2. Use idiomatic ${getLanguageName(targetLanguage)} conventions and best practices
3. Add comments explaining any significant differences in approach
4. If exact equivalents don't exist, provide the closest alternative with explanation
5. Include any necessary library imports
6. Maintain the same variable names where possible for clarity

## Response Format:
Please return a JSON object with the following structure:
{
  "convertedCode": "The complete converted code in ${getLanguageName(targetLanguage)}",
  "requiredLibraries": ["list of required libraries/packages to install"],
  "notes": [
    {
      "topic": "Brief topic",
      "explanation": "Explanation of conversion choices or differences"
    }
  ],
  "equivalenceNotes": "Any important notes about functional equivalence",
  "caveats": "Any caveats or limitations in the conversion"
}

Return ONLY valid JSON, no additional text.`

      const systemMessage = `You are a polyglot programmer expert in R, Python, and Stata for econometrics and data analysis. You understand the idioms, libraries, and conventions of each language deeply. You convert code accurately while adapting to each language's best practices. Always respond with valid JSON only.`

      const response = await callChatGPT(prompt, systemMessage)
      
      let parsed = parseJSONResponse(response.content)
      if (parsed) {
        setResult({ type: 'convert', data: parsed, from: sourceLanguage, to: targetLanguage })
      } else {
        setResult({ type: 'convert', raw: response.content })
      }

    } catch (err) {
      console.error('Error converting code:', err)
      setError('Failed to convert code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const parseJSONResponse = (content) => {
    try {
      return JSON.parse(content)
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim())
        } catch {}
      }
      
      // Try to find JSON object
      const jsonStart = content.indexOf('{')
      const jsonEnd = content.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          return JSON.parse(content.substring(jsonStart, jsonEnd + 1))
        } catch {}
      }
    }
    return null
  }

  const handleClear = () => {
    setCode('')
    setResult(null)
    setError('')
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Failed to copy'))
  }

  const handleAction = () => {
    switch (activeTab) {
      case 'annotate':
        handleAnnotate()
        break
      case 'suggest':
        handleSuggest()
        break
      case 'convert':
        handleConvert()
        break
    }
  }

  const renderAnnotateResult = () => {
    if (!result || result.type !== 'annotate') return null
    
    if (result.raw) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Code Annotations</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            {result.raw}
          </pre>
        </div>
      )
    }

    const { data } = result
    return (
      <div className="space-y-6">
        {/* Summary */}
        {data.summary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Summary</h3>
            <p className="text-gray-700">{data.summary}</p>
            {data.keyOperations && data.keyOperations.length > 0 && (
              <div className="mt-4">
                <span className="font-semibold text-gray-700">Key Operations:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.keyOperations.map((op, idx) => (
                    <span key={idx} className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm">
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Annotated Code */}
        {data.annotatedCode && data.annotatedCode.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">💬 Line-by-Line Annotations</h3>
            </div>
            <div className="space-y-4">
              {data.annotatedCode.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                    <span className="text-cyan-400 text-xs font-mono">Lines {item.lineNumbers}</span>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 px-4 py-3 text-sm font-mono overflow-x-auto">
                    {item.code}
                  </pre>
                  <div className="bg-cyan-50 px-4 py-3 border-t border-cyan-100">
                    <p className="text-gray-700 text-sm">{item.annotation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSuggestResult = () => {
    if (!result || result.type !== 'suggest') return null
    
    if (result.raw) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Suggestions</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            {result.raw}
          </pre>
        </div>
      )
    }

    const { data } = result
    const severityColors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    }

    return (
      <div className="space-y-6">
        {/* Overall Assessment */}
        {data.overallAssessment && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📊 Overall Assessment</h3>
            <p className="text-gray-700">{data.overallAssessment}</p>
          </div>
        )}

        {/* Suggestions */}
        {data.suggestions && data.suggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Suggestions</h3>
            <div className="space-y-4">
              {data.suggestions.map((suggestion, idx) => (
                <div key={idx} className={`border rounded-lg p-4 ${severityColors[suggestion.severity] || 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{suggestion.category}</span>
                    <span className={`px-2 py-0.5 rounded text-xs uppercase ${
                      suggestion.severity === 'high' ? 'bg-red-200' :
                      suggestion.severity === 'medium' ? 'bg-yellow-200' : 'bg-green-200'
                    }`}>
                      {suggestion.severity}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-2"><strong>Issue:</strong> {suggestion.issue}</p>
                  <p className="text-gray-700"><strong>Suggestion:</strong> {suggestion.suggestion}</p>
                  {suggestion.codeExample && (
                    <pre className="mt-2 bg-gray-800 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                      {suggestion.codeExample}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improved Code */}
        {data.improvedCode && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">✨ Improved Code</h3>
              <button
                onClick={() => handleCopy(data.improvedCode)}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                📋 Copy Code
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
              {data.improvedCode}
            </pre>
            {data.summary && (
              <p className="mt-4 text-gray-600 text-sm italic">{data.summary}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderConvertResult = () => {
    if (!result || result.type !== 'convert') return null
    
    if (result.raw) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Conversion Result</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            {result.raw}
          </pre>
        </div>
      )
    }

    const { data, from, to } = result
    return (
      <div className="space-y-6">
        {/* Converted Code */}
        {data.convertedCode && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                🔄 {getLanguageName(from)} → {getLanguageName(to)}
              </h3>
              <button
                onClick={() => handleCopy(data.convertedCode)}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                📋 Copy Code
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
              {data.convertedCode}
            </pre>
          </div>
        )}

        {/* Required Libraries */}
        {data.requiredLibraries && data.requiredLibraries.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📦 Required Libraries</h3>
            <div className="flex flex-wrap gap-2">
              {data.requiredLibraries.map((lib, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-mono">
                  {lib}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conversion Notes */}
        {data.notes && data.notes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Conversion Notes</h3>
            <div className="space-y-3">
              {data.notes.map((note, idx) => (
                <div key={idx} className="border-l-4 border-cyan-400 pl-4 py-1">
                  <span className="font-semibold text-cyan-700">{note.topic}:</span>
                  <p className="text-gray-600 mt-1">{note.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caveats */}
        {data.caveats && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">⚠️</span>
              <div>
                <span className="font-semibold text-amber-800">Caveats:</span>
                <p className="text-amber-700 mt-1">{data.caveats}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profession-dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Coding Helper</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Code Annotation, Review & Translation</h2>
          <p className="text-cyan-100">
            Upload your R, Python, or Stata code to get line-by-line annotations, 
            improvement suggestions, or convert between languages.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Tab Selection */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('annotate')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === 'annotate'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💬 Annotate
                </button>
                <button
                  onClick={() => setActiveTab('suggest')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === 'suggest'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💡 Suggest
                </button>
                <button
                  onClick={() => setActiveTab('convert')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === 'convert'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔄 Convert
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {activeTab === 'convert' ? '🌐 Languages' : '📝 Source Language'}
              </h3>
              
              <div className={`grid ${activeTab === 'convert' ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-3'}`}>
                {activeTab === 'convert' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {languages.map(lang => (
                          <button
                            key={lang.id}
                            onClick={() => setSourceLanguage(lang.id)}
                            className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                              sourceLanguage === lang.id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {lang.icon} {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">To:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {languages.map(lang => (
                          <button
                            key={lang.id}
                            onClick={() => setTargetLanguage(lang.id)}
                            disabled={lang.id === sourceLanguage}
                            className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                              targetLanguage === lang.id
                                ? 'bg-cyan-600 text-white'
                                : lang.id === sourceLanguage
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {lang.icon} {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  languages.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setSourceLanguage(lang.id)}
                      className={`px-4 py-3 rounded-lg font-medium transition ${
                        sourceLanguage === lang.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang.icon} {lang.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Code Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📄 Your Code ({getLanguageName(sourceLanguage)})
              </h3>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`Paste your ${getLanguageName(sourceLanguage)} code here...

Example (Python):
import pandas as pd
import statsmodels.api as sm

# Load data
df = pd.read_csv('data.csv')

# Run regression
X = sm.add_constant(df[['education', 'experience']])
y = df['wage']
model = sm.OLS(y, X).fit()
print(model.summary())`}
                className="w-full h-80 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                spellCheck="false"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={loading || !code.trim()}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  activeTab === 'annotate' ? '💬 Generate Annotations' :
                  activeTab === 'suggest' ? '💡 Get Suggestions' :
                  '🔄 Convert Code'
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {result && (
              <>
                {result.type === 'annotate' && renderAnnotateResult()}
                {result.type === 'suggest' && renderSuggestResult()}
                {result.type === 'convert' && renderConvertResult()}
              </>
            )}

            {/* Empty State */}
            {!result && !loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">
                  {activeTab === 'annotate' ? '💬' : activeTab === 'suggest' ? '💡' : '🔄'}
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {activeTab === 'annotate' ? 'Annotations Will Appear Here' :
                   activeTab === 'suggest' ? 'Suggestions Will Appear Here' :
                   'Converted Code Will Appear Here'}
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'annotate' 
                    ? 'Enter your code and click "Generate Annotations" to get line-by-line explanations.'
                    : activeTab === 'suggest'
                    ? 'Enter your code and click "Get Suggestions" to receive improvement recommendations.'
                    : 'Enter your code and click "Convert Code" to convert it to another language.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CodingHelper
