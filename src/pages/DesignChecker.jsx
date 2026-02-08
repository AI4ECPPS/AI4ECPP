import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function DesignChecker() {
  const navigate = useNavigate()
  
  // Mode: 'survey' or 'research'
  const [mode, setMode] = useState('survey')
  
  // ==================== Survey Checker States ====================
  const [surveyText, setSurveyText] = useState('')
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveyError, setSurveyError] = useState('')
  const [surveyResult, setSurveyResult] = useState(null)
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

  // ==================== Research Design States ====================
  const [researchQuestion, setResearchQuestion] = useState('')
  const [dataStructure, setDataStructure] = useState('')
  const [method, setMethod] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchError, setResearchError] = useState('')
  const [researchResult, setResearchResult] = useState(null)

  const dataStructures = [
    { id: 'cross-section', name: 'Cross-Section', description: 'Single time point observation' },
    { id: 'panel', name: 'Panel / Longitudinal', description: 'Multiple time periods, same units' },
    { id: 'repeated-cross', name: 'Repeated Cross-Section', description: 'Multiple time periods, different units' },
    { id: 'time-series', name: 'Time Series', description: 'Single unit over time' },
  ]

  const methods = [
    { id: 'did', name: 'Difference-in-Differences (DID)', description: 'Compare treatment vs control before/after' },
    { id: 'rd', name: 'Regression Discontinuity (RD)', description: 'Exploit cutoff/threshold for identification' },
    { id: 'iv', name: 'Instrumental Variables (IV)', description: 'Use instrument to address endogeneity' },
    { id: 'ols', name: 'OLS with Controls', description: 'Selection on observables assumption' },
    { id: 'fe', name: 'Fixed Effects', description: 'Control for time-invariant unobservables' },
    { id: 'psm', name: 'Propensity Score Matching', description: 'Match on propensity to receive treatment' },
    { id: 'event-study', name: 'Event Study', description: 'Examine effects around specific event' },
    { id: 'synth', name: 'Synthetic Control', description: 'Construct synthetic counterfactual' },
    { id: 'bunching', name: 'Bunching', description: 'Exploit bunching at kinks/notches' },
    { id: 'unsure', name: 'Not Sure / Need Recommendation', description: 'Get method suggestions' },
  ]

  // ==================== Survey Analysis Handler ====================
  const handleSurveyAnalyze = async () => {
    if (!surveyText.trim()) {
      setSurveyError('Please enter your survey questions')
      return
    }

    setSurveyLoading(true)
    setSurveyError('')
    setSurveyResult(null)

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
          overallAssessment: content,
          questions: [],
          generalRecommendations: []
        }
      }

      setSurveyResult(parsed)
    } catch (err) {
      console.error('Analysis error:', err)
      if (err.message?.includes('API key')) {
        setSurveyError('API key not configured. Please check your settings.')
      } else {
        setSurveyError('Failed to analyze the survey. Please try again.')
      }
    } finally {
      setSurveyLoading(false)
    }
  }

  // ==================== Research Design Handler ====================
  const handleResearchAnalyze = async () => {
    if (!researchQuestion.trim()) {
      setResearchError('Please enter your research question')
      return
    }
    if (!dataStructure) {
      setResearchError('Please select your data structure')
      return
    }

    setResearchLoading(true)
    setResearchError('')
    setResearchResult(null)

    try {
      const methodInfo = method ? methods.find(m => m.id === method)?.name : 'Not specified (need recommendation)'
      const dataInfo = dataStructures.find(d => d.id === dataStructure)?.name

      const prompt = `You are an expert econometrician and research methodology advisor specializing in causal inference for applied economics and policy research.

A student is planning a research project and needs guidance on their research design. Please analyze their setup and provide detailed recommendations.

**Student's Input:**
- **Research Question:** ${researchQuestion}
- **Data Structure:** ${dataInfo}
- **Proposed Method:** ${methodInfo}
${additionalContext ? `- **Additional Context:** ${additionalContext}` : ''}

Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "A 2-3 sentence summary of the research design assessment",
  
  "identificationStrategy": {
    "recommended": "The recommended identification strategy",
    "explanation": "Why this strategy is appropriate for this research question and data",
    "keyAssumptions": ["List of key identifying assumptions that must hold"],
    "alternativeStrategies": ["Other potential strategies that could work"]
  },
  
  "threats": {
    "major": [
      {
        "threat": "Name of the threat",
        "description": "Why this is a concern",
        "mitigation": "How to address or test for this"
      }
    ],
    "minor": [
      {
        "threat": "Name of the threat", 
        "description": "Why this might be a concern"
      }
    ]
  },
  
  "causalInference": {
    "canMakeCausalClaim": true/false,
    "confidenceLevel": "high" | "medium" | "low",
    "explanation": "Why or why not causal claims are justified",
    "caveats": ["Important caveats to mention when interpreting results"],
    "languageSuggestion": "Suggested language for describing results (e.g., 'causal effect' vs 'association')"
  },
  
  "robustnessChecks": {
    "essential": [
      {
        "check": "Name of the check",
        "purpose": "What this tests for",
        "implementation": "How to implement this"
      }
    ],
    "recommended": [
      {
        "check": "Name of the check",
        "purpose": "What this tests for"
      }
    ],
    "ifDataAllows": ["Additional checks if data permits"]
  },
  
  "dataRequirements": {
    "minimum": ["Minimum data requirements"],
    "ideal": ["Ideal additional data to strengthen design"],
    "sampleSizeConsiderations": "Notes on sample size and power"
  },
  
  "literatureSuggestions": ["Relevant methodological papers or examples to consult"],
  
  "additionalAdvice": "Any other important considerations or recommendations"
}

Be specific to applied economics/policy research. Consider standard concerns in the field like selection bias, omitted variables, measurement error, external validity, etc.`

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
          identificationStrategy: {},
          threats: { major: [], minor: [] },
          causalInference: {},
          robustnessChecks: { essential: [], recommended: [] }
        }
      }

      setResearchResult(parsed)
    } catch (err) {
      console.error('Analysis error:', err)
      if (err.message?.includes('API key')) {
        setResearchError('API key not configured. Please check your settings.')
      } else {
        setResearchError('Failed to analyze. Please try again.')
      }
    } finally {
      setResearchLoading(false)
    }
  }

  // ==================== Clear Handlers ====================
  const handleSurveyClear = () => {
    setSurveyText('')
    setSurveyResult(null)
    setSurveyError('')
  }

  const handleResearchClear = () => {
    setResearchQuestion('')
    setDataStructure('')
    setMethod('')
    setAdditionalContext('')
    setResearchResult(null)
    setResearchError('')
  }

  // ==================== Helper Functions ====================
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

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // ==================== Survey Checker UI ====================
  const renderSurveyChecker = () => (
    <>
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

...`}
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none font-mono text-sm"
            />
            <p className="mt-2 text-sm text-gray-500">
              Tip: Include question numbers, options, and any instructions for best results.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            {surveyError && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg">
                {surveyError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSurveyAnalyze}
                disabled={surveyLoading || !surveyText.trim()}
                className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {surveyLoading ? (
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
                onClick={handleSurveyClear}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {surveyResult ? (
            <>
              {/* Overall Assessment */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">📊 Overall Assessment</h3>
                  {surveyResult.overallScore && (
                    <div className={`text-3xl font-bold ${getScoreColor(surveyResult.overallScore)}`}>
                      {surveyResult.overallScore}/10
                    </div>
                  )}
                </div>
                <p className="text-gray-700">{surveyResult.overallAssessment}</p>
              </div>

              {/* Strengths */}
              {surveyResult.strengthsFound?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">✅ Strengths</h3>
                  <ul className="space-y-2">
                    {surveyResult.strengthsFound.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-green-700">
                        <span>•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Question-by-Question Analysis */}
              {surveyResult.questions?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Question Analysis</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {surveyResult.questions.map((q, idx) => (
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
              {surveyResult.generalRecommendations?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">💡 General Recommendations</h3>
                  <ul className="space-y-2">
                    {surveyResult.generalRecommendations.map((rec, idx) => (
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
    </>
  )

  // ==================== Research Design UI ====================
  const renderResearchDesign = () => (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left Column - Input */}
      <div className="space-y-6">
        {/* Research Question */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">❓ Research Question</h3>
          <textarea
            value={researchQuestion}
            onChange={(e) => setResearchQuestion(e.target.value)}
            placeholder="What is the causal effect of [X] on [Y]? 

Example: What is the effect of minimum wage increases on employment in the restaurant industry?"
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Data Structure */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Data Structure</h3>
          <div className="grid grid-cols-2 gap-3">
            {dataStructures.map((ds) => (
              <button
                key={ds.id}
                onClick={() => setDataStructure(ds.id)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  dataStructure === ds.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-medium text-gray-800">{ds.name}</div>
                <div className="text-xs text-gray-500 mt-1">{ds.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ Proposed Method</h3>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  method === m.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-800">{m.name}</div>
                <div className="text-xs text-gray-500">{m.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Context */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Additional Context (Optional)</h3>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any additional details about your data, treatment, setting, or concerns...

Example: I have county-level data from 2010-2020. Treatment is a state-level policy change in 2015 affecting some but not all states."
            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6">
          {researchError && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg">
              {researchError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleResearchAnalyze}
              disabled={researchLoading || !researchQuestion.trim() || !dataStructure}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {researchLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                '🔬 Get Design Advice'
              )}
            </button>
            <button
              onClick={handleResearchClear}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="space-y-6">
        {researchResult ? (
          <>
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Summary</h3>
              <p className="text-gray-700">{researchResult.summary}</p>
            </div>

            {/* Causal Inference Assessment */}
            {researchResult.causalInference && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⚖️ Causal Inference Assessment</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    researchResult.causalInference.canMakeCausalClaim 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {researchResult.causalInference.canMakeCausalClaim ? '✓ Causal Claims Possible' : '✗ Causal Claims Difficult'}
                  </span>
                  {researchResult.causalInference.confidenceLevel && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(researchResult.causalInference.confidenceLevel)}`}>
                      {researchResult.causalInference.confidenceLevel.toUpperCase()} confidence
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mb-3">{researchResult.causalInference.explanation}</p>
                {researchResult.causalInference.languageSuggestion && (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-indigo-700">Suggested Language: </span>
                    <span className="text-sm text-indigo-600 italic">"{researchResult.causalInference.languageSuggestion}"</span>
                  </div>
                )}
                {researchResult.causalInference.caveats?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-gray-700">Caveats:</span>
                    <ul className="mt-1 space-y-1">
                      {researchResult.causalInference.caveats.map((caveat, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-yellow-500">⚠️</span>
                          {caveat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Identification Strategy */}
            {researchResult.identificationStrategy && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Identification Strategy</h3>
                {researchResult.identificationStrategy.recommended && (
                  <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                    <div className="font-medium text-indigo-800 mb-1">Recommended:</div>
                    <div className="text-indigo-700">{researchResult.identificationStrategy.recommended}</div>
                  </div>
                )}
                {researchResult.identificationStrategy.explanation && (
                  <p className="text-gray-700 mb-3">{researchResult.identificationStrategy.explanation}</p>
                )}
                {researchResult.identificationStrategy.keyAssumptions?.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-700 mb-2">Key Identifying Assumptions:</div>
                    <ul className="space-y-1">
                      {researchResult.identificationStrategy.keyAssumptions.map((assumption, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-500">•</span>
                          {assumption}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {researchResult.identificationStrategy.alternativeStrategies?.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-700 mb-2">Alternative Strategies:</div>
                    <div className="flex flex-wrap gap-2">
                      {researchResult.identificationStrategy.alternativeStrategies.map((alt, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Threats */}
            {researchResult.threats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Threats to Validity</h3>
                
                {researchResult.threats.major?.length > 0 && (
                  <div className="mb-4">
                    <div className="font-medium text-red-700 mb-2">Major Threats:</div>
                    <div className="space-y-3">
                      {researchResult.threats.major.map((threat, idx) => (
                        <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="font-medium text-red-800">{threat.threat}</div>
                          <p className="text-sm text-red-700 mt-1">{threat.description}</p>
                          {threat.mitigation && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-green-700">Mitigation: </span>
                              <span className="text-green-600">{threat.mitigation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {researchResult.threats.minor?.length > 0 && (
                  <div>
                    <div className="font-medium text-yellow-700 mb-2">Minor Threats:</div>
                    <div className="space-y-2">
                      {researchResult.threats.minor.map((threat, idx) => (
                        <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <div className="font-medium text-yellow-800">{threat.threat}</div>
                          <p className="text-sm text-yellow-700">{threat.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Robustness Checks */}
            {researchResult.robustnessChecks && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Robustness Checks</h3>
                
                {researchResult.robustnessChecks.essential?.length > 0 && (
                  <div className="mb-4">
                    <div className="font-medium text-green-700 mb-2">Essential Checks:</div>
                    <div className="space-y-2">
                      {researchResult.robustnessChecks.essential.map((check, idx) => (
                        <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="font-medium text-green-800">{check.check}</div>
                          <p className="text-sm text-green-700">{check.purpose}</p>
                          {check.implementation && (
                            <p className="text-xs text-green-600 mt-1 italic">{check.implementation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {researchResult.robustnessChecks.recommended?.length > 0 && (
                  <div className="mb-4">
                    <div className="font-medium text-blue-700 mb-2">Recommended Checks:</div>
                    <div className="space-y-2">
                      {researchResult.robustnessChecks.recommended.map((check, idx) => (
                        <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="font-medium text-blue-800">{check.check}</div>
                          <p className="text-sm text-blue-700">{check.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {researchResult.robustnessChecks.ifDataAllows?.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-600 mb-2">If Data Allows:</div>
                    <ul className="space-y-1">
                      {researchResult.robustnessChecks.ifDataAllows.map((check, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span>•</span>
                          {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Data Requirements */}
            {researchResult.dataRequirements && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Data Requirements</h3>
                {researchResult.dataRequirements.minimum?.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-700 mb-1">Minimum:</div>
                    <ul className="space-y-1">
                      {researchResult.dataRequirements.minimum.map((req, idx) => (
                        <li key={idx} className="text-sm text-gray-600">• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {researchResult.dataRequirements.ideal?.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-700 mb-1">Ideal:</div>
                    <ul className="space-y-1">
                      {researchResult.dataRequirements.ideal.map((req, idx) => (
                        <li key={idx} className="text-sm text-gray-600">• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {researchResult.dataRequirements.sampleSizeConsiderations && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                    <span className="font-medium">Sample Size: </span>
                    {researchResult.dataRequirements.sampleSizeConsiderations}
                  </div>
                )}
              </div>
            )}

            {/* Literature & Additional Advice */}
            {(researchResult.literatureSuggestions?.length > 0 || researchResult.additionalAdvice) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📚 Additional Resources</h3>
                {researchResult.literatureSuggestions?.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-700 mb-2">Suggested Reading:</div>
                    <ul className="space-y-1">
                      {researchResult.literatureSuggestions.map((lit, idx) => (
                        <li key={idx} className="text-sm text-gray-600">• {lit}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {researchResult.additionalAdvice && (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="font-medium text-indigo-700 mb-1">Additional Advice:</div>
                    <p className="text-sm text-indigo-600">{researchResult.additionalAdvice}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔬</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Design Advice Will Appear Here
            </h3>
            <p className="text-gray-500">
              Enter your research question, select data structure and method, then click "Get Design Advice".
            </p>
          </div>
        )}
      </div>
    </div>
  )

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
            <h1 className="text-2xl font-bold text-gray-800">Design Checker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setMode('survey')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                mode === 'survey'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-2xl mr-2">📋</span>
              Survey Design Checker
            </button>
            <button
              onClick={() => setMode('research')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                mode === 'research'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-2xl mr-2">🔬</span>
              Research Design Advisor
            </button>
          </div>
        </div>

        {/* Introduction */}
        {mode === 'survey' ? (
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl p-6 text-white mb-8">
            <h2 className="text-2xl font-bold mb-2">📋 Survey Question Design Checker</h2>
            <p className="opacity-90">
              Paste your survey questions to get feedback based on best practices in social science research methodology.
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <h2 className="text-2xl font-bold mb-2">🔬 Research Design Advisor</h2>
            <p className="opacity-90">
              Get expert guidance on your identification strategy, potential threats to validity, and recommended robustness checks for your empirical research.
            </p>
          </div>
        )}

        {/* Content */}
        {mode === 'survey' ? renderSurveyChecker() : renderResearchDesign()}
      </main>
    </div>
  )
}

export default DesignChecker
