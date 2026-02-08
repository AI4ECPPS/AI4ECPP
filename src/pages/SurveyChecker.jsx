import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function SurveyChecker() {
  const navigate = useNavigate()
  
  const [surveyText, setSurveyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [checkType, setCheckType] = useState('full')

  const checkTypes = [
    { id: 'full', name: 'Full Review', description: 'Complete analysis with all principles' },
    { id: 'quick', name: 'Quick Check', description: 'Focus on major issues only' },
    { id: 'rewrite', name: 'Rewrite Suggestions', description: 'Get improved versions of problematic questions' },
  ]

  const principles = [
    { id: 1, title: 'One question, one thing', description: 'Do not combine two behaviors or concepts in one question' },
    { id: 2, title: 'Quantifiable expressions', description: 'Use specific numbers, ranges, or time periods instead of vague terms' },
    { id: 3, title: 'Avoid leading questions', description: 'Do not imply a "correct answer" or use value-laden language' },
    { id: 4, title: 'Clear time windows', description: 'Specify "past 7 days / 14 days / one month" explicitly' },
    { id: 5, title: 'MECE options', description: 'Options should be mutually exclusive and collectively exhaustive' },
    { id: 6, title: 'Sensitive questions last', description: 'Place income, health, identity questions at the end' },
    { id: 7, title: 'Provide exit options', description: 'Include "Not sure / Prefer not to answer" when appropriate' },
    { id: 8, title: 'Consistent scale direction', description: 'Keep 1-5 or 1-7 scale meanings consistent throughout' },
  ]

  const handleAnalyze = async () => {
    if (!surveyText.trim()) {
      setError('Please enter your survey questions')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      let promptInstructions = ''
      
      if (checkType === 'full') {
        promptInstructions = `Provide a comprehensive analysis covering all 8 principles. For each question, identify which principles are violated (if any) and explain why.`
      } else if (checkType === 'quick') {
        promptInstructions = `Focus only on the most critical issues. Highlight questions with serious problems that could affect data quality.`
      } else if (checkType === 'rewrite') {
        promptInstructions = `For each problematic question, provide a rewritten version that follows best practices. Show the original and improved version side by side.`
      }

      const prompt = `You are an expert in survey methodology and questionnaire design for social science research. Analyze the following survey questionnaire based on these 8 key principles:

**8 Key Principles for Survey Question Design:**

1. **One question, one thing** - Do not combine two behaviors or concepts in one question.
2. **Use quantifiable, operationalizable expressions** - Avoid vague terms like "often/many/few"; use specific numbers, ranges, or time periods.
3. **Avoid leading questions and value judgments** - Do not imply a "correct answer"; use neutral wording.
4. **Specify clear recall time windows** - Clearly state "past 7 days / 14 days / one month".
5. **Options should be exhaustive and mutually exclusive (MECE)** - All situations should be coverable, with no overlapping options.
6. **Place sensitive questions at the end** - Ask about income, health, identity last.
7. **Provide an exit for those unable or unwilling to answer** - Add "Not sure / Prefer not to answer" options.
8. **Keep scale direction consistent** - The meaning of 1-5 should not change within the same questionnaire.

${promptInstructions}

Please respond in the following JSON format:
{
  "overallAssessment": "A brief overall assessment of the survey quality (2-3 sentences)",
  "overallScore": <number from 1-10>,
  "questions": [
    {
      "questionNumber": <number or identifier>,
      "originalText": "The original question text",
      "issues": [
        {
          "principle": <principle number 1-8>,
          "severity": "high" | "medium" | "low",
          "explanation": "Why this is an issue"
        }
      ],
      "suggestion": "Suggested improvement or rewritten version (if applicable)",
      "isGood": <boolean - true if no significant issues>
    }
  ],
  "generalRecommendations": ["List of general recommendations for improvement"],
  "strengthsFound": ["List of things done well in the survey"]
}

Here is the survey to analyze:

${surveyText}`

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
        // If JSON parsing fails, create a simple result
        parsed = {
          overallAssessment: content,
          questions: [],
          generalRecommendations: []
        }
      }

      setResult(parsed)
    } catch (err) {
      console.error('Analysis error:', err)
      if (err.message?.includes('API key')) {
        setError('API key not configured. Please check your settings.')
      } else {
        setError('Failed to analyze the survey. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSurveyText('')
    setResult(null)
    setError('')
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

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
            <h1 className="text-2xl font-bold text-gray-800">Survey Design Checker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">📋 Survey Question Design Checker</h2>
          <p className="opacity-90">
            Paste your survey questions to get feedback based on best practices in social science research methodology.
          </p>
        </div>

        {/* Principles Reference */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📖 8 Key Principles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {principles.map((p) => (
              <div key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {p.id}
                  </span>
                  <span className="font-medium text-sm text-gray-800">{p.title}</span>
                </div>
                <p className="text-xs text-gray-600">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Check Type Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Analysis Type</h3>
              <div className="grid grid-cols-3 gap-2">
                {checkTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setCheckType(type.id)}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      checkType === type.id
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Survey Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Your Survey Questions</h3>
              <textarea
                value={surveyText}
                onChange={(e) => setSurveyText(e.target.value)}
                placeholder={`Paste your survey questions here. Example:

Q1. How often do you exercise and eat healthy food?
a) Always
b) Sometimes  
c) Rarely

Q2. Do you agree that the government's excellent new policy will improve the economy?
a) Strongly agree
b) Agree
c) Disagree

Q3. What is your income?
a) Low
b) Medium
c) High

...`}
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Tip: Include question numbers, options, and any instructions for best results.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !surveyText.trim()}
                  className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    '🔍 Check Survey Design'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Overall Assessment */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-800">📊 Overall Assessment</h3>
                    {result.overallScore && (
                      <div className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>
                        {result.overallScore}/10
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700">{result.overallAssessment}</p>
                </div>

                {/* Strengths */}
                {result.strengthsFound?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">✅ Strengths</h3>
                    <ul className="space-y-2">
                      {result.strengthsFound.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-green-700">
                          <span>•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Question-by-Question Analysis */}
                {result.questions?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Question Analysis</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {result.questions.map((q, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-lg border ${
                            q.isGood ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-700">
                              Q{q.questionNumber || idx + 1}
                            </span>
                            {q.isGood && <span className="text-green-600">✓ Good</span>}
                          </div>
                          
                          {q.originalText && (
                            <p className="text-sm text-gray-600 mb-2 italic">"{q.originalText}"</p>
                          )}
                          
                          {q.issues?.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {q.issues.map((issue, iIdx) => (
                                <div 
                                  key={iIdx} 
                                  className={`p-2 rounded border ${getSeverityColor(issue.severity)}`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold">
                                      Principle {issue.principle}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      issue.severity === 'high' ? 'bg-red-200' :
                                      issue.severity === 'medium' ? 'bg-yellow-200' : 'bg-blue-200'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                  </div>
                                  <p className="text-sm">{issue.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {q.suggestion && (
                            <div className="bg-white p-3 rounded border border-rose-200">
                              <span className="text-xs font-bold text-rose-600 block mb-1">
                                💡 Suggested Improvement:
                              </span>
                              <p className="text-sm text-gray-700">{q.suggestion}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Recommendations */}
                {result.generalRecommendations?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">💡 General Recommendations</h3>
                    <ul className="space-y-2">
                      {result.generalRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-rose-500">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Results Will Appear Here
                </h3>
                <p className="text-gray-500">
                  Paste your survey questions and click "Check Survey Design" to get feedback.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default SurveyChecker
