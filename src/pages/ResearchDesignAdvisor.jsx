import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function ResearchDesignAdvisor() {
  const navigate = useNavigate()
  
  const [researchQuestion, setResearchQuestion] = useState('')
  const [dataStructure, setDataStructure] = useState('')
  const [method, setMethod] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

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

  const handleAnalyze = async () => {
    if (!researchQuestion.trim()) {
      setError('Please enter your research question')
      return
    }
    if (!dataStructure) {
      setError('Please select your data structure')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

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
        parsed = {
          summary: content,
          identificationStrategy: {},
          threats: { major: [], minor: [] },
          causalInference: {},
          robustnessChecks: { essential: [], recommended: [] }
        }
      }

      setResult(parsed)
    } catch (err) {
      console.error('Analysis error:', err)
      if (err.message?.includes('API key')) {
        setError('API key not configured. Please check your settings.')
      } else {
        setError('Failed to analyze. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setResearchQuestion('')
    setDataStructure('')
    setMethod('')
    setAdditionalContext('')
    setResult(null)
    setError('')
  }

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Research Design Advisor</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">🔬 Research Design Advisor</h2>
          <p className="opacity-90">
            Get expert guidance on your identification strategy, potential threats to validity, and recommended robustness checks for your empirical research.
          </p>
        </div>

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
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !researchQuestion.trim() || !dataStructure}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    '🔬 Get Design Advice'
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
                {/* Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Summary</h3>
                  <p className="text-gray-700">{result.summary}</p>
                </div>

                {/* Causal Inference Assessment */}
                {result.causalInference && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">⚖️ Causal Inference Assessment</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full font-medium ${
                        result.causalInference.canMakeCausalClaim 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.causalInference.canMakeCausalClaim ? '✓ Causal Claims Possible' : '✗ Causal Claims Difficult'}
                      </span>
                      {result.causalInference.confidenceLevel && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(result.causalInference.confidenceLevel)}`}>
                          {result.causalInference.confidenceLevel.toUpperCase()} confidence
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-3">{result.causalInference.explanation}</p>
                    {result.causalInference.languageSuggestion && (
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="text-sm font-medium text-indigo-700">Suggested Language: </span>
                        <span className="text-sm text-indigo-600 italic">"{result.causalInference.languageSuggestion}"</span>
                      </div>
                    )}
                    {result.causalInference.caveats?.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">Caveats:</span>
                        <ul className="mt-1 space-y-1">
                          {result.causalInference.caveats.map((caveat, idx) => (
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
                {result.identificationStrategy && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Identification Strategy</h3>
                    {result.identificationStrategy.recommended && (
                      <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                        <div className="font-medium text-indigo-800 mb-1">Recommended:</div>
                        <div className="text-indigo-700">{result.identificationStrategy.recommended}</div>
                      </div>
                    )}
                    {result.identificationStrategy.explanation && (
                      <p className="text-gray-700 mb-3">{result.identificationStrategy.explanation}</p>
                    )}
                    {result.identificationStrategy.keyAssumptions?.length > 0 && (
                      <div className="mb-3">
                        <div className="font-medium text-gray-700 mb-2">Key Identifying Assumptions:</div>
                        <ul className="space-y-1">
                          {result.identificationStrategy.keyAssumptions.map((assumption, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-indigo-500">•</span>
                              {assumption}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.identificationStrategy.alternativeStrategies?.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-700 mb-2">Alternative Strategies:</div>
                        <div className="flex flex-wrap gap-2">
                          {result.identificationStrategy.alternativeStrategies.map((alt, idx) => (
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
                {result.threats && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Threats to Validity</h3>
                    
                    {result.threats.major?.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium text-red-700 mb-2">Major Threats:</div>
                        <div className="space-y-3">
                          {result.threats.major.map((threat, idx) => (
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
                    
                    {result.threats.minor?.length > 0 && (
                      <div>
                        <div className="font-medium text-yellow-700 mb-2">Minor Threats:</div>
                        <div className="space-y-2">
                          {result.threats.minor.map((threat, idx) => (
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
                {result.robustnessChecks && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Robustness Checks</h3>
                    
                    {result.robustnessChecks.essential?.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium text-green-700 mb-2">Essential Checks:</div>
                        <div className="space-y-2">
                          {result.robustnessChecks.essential.map((check, idx) => (
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
                    
                    {result.robustnessChecks.recommended?.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium text-blue-700 mb-2">Recommended Checks:</div>
                        <div className="space-y-2">
                          {result.robustnessChecks.recommended.map((check, idx) => (
                            <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="font-medium text-blue-800">{check.check}</div>
                              <p className="text-sm text-blue-700">{check.purpose}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.robustnessChecks.ifDataAllows?.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-600 mb-2">If Data Allows:</div>
                        <ul className="space-y-1">
                          {result.robustnessChecks.ifDataAllows.map((check, idx) => (
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
                {result.dataRequirements && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Data Requirements</h3>
                    {result.dataRequirements.minimum?.length > 0 && (
                      <div className="mb-3">
                        <div className="font-medium text-gray-700 mb-1">Minimum:</div>
                        <ul className="space-y-1">
                          {result.dataRequirements.minimum.map((req, idx) => (
                            <li key={idx} className="text-sm text-gray-600">• {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.dataRequirements.ideal?.length > 0 && (
                      <div className="mb-3">
                        <div className="font-medium text-gray-700 mb-1">Ideal:</div>
                        <ul className="space-y-1">
                          {result.dataRequirements.ideal.map((req, idx) => (
                            <li key={idx} className="text-sm text-gray-600">• {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.dataRequirements.sampleSizeConsiderations && (
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                        <span className="font-medium">Sample Size: </span>
                        {result.dataRequirements.sampleSizeConsiderations}
                      </div>
                    )}
                  </div>
                )}

                {/* Literature & Additional Advice */}
                {(result.literatureSuggestions?.length > 0 || result.additionalAdvice) && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📚 Additional Resources</h3>
                    {result.literatureSuggestions?.length > 0 && (
                      <div className="mb-3">
                        <div className="font-medium text-gray-700 mb-2">Suggested Reading:</div>
                        <ul className="space-y-1">
                          {result.literatureSuggestions.map((lit, idx) => (
                            <li key={idx} className="text-sm text-gray-600">• {lit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.additionalAdvice && (
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="font-medium text-indigo-700 mb-1">Additional Advice:</div>
                        <p className="text-sm text-indigo-600">{result.additionalAdvice}</p>
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
      </main>
    </div>
  )
}

export default ResearchDesignAdvisor
