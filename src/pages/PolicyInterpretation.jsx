import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function PolicyInterpretation() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  // Mode: 'interpret' or 'report'
  const [mode, setMode] = useState('interpret')
  
  // Input states (shared)
  const [inputMethod, setInputMethod] = useState('text') // 'text' or 'image'
  const [regressionResults, setRegressionResults] = useState('')
  const [researchContext, setResearchContext] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  // Report Generator states
  const [targetAudience, setTargetAudience] = useState('government') // 'government' or 'private'
  const [reportType, setReportType] = useState('policy_brief') // different report types
  const [reportTitle, setReportTitle] = useState('')
  const [keyFindings, setKeyFindings] = useState('')
  const [generatedReport, setGeneratedReport] = useState(null)
  const [reportFormat, setReportFormat] = useState('text') // 'text' or 'latex'
  
  // Output states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interpretation, setInterpretation] = useState(null)
  
  // Report type options
  const reportTypes = {
    government: [
      { id: 'policy_brief', name: 'Policy Brief', desc: 'Concise 2-3 page summary for decision-makers' },
      { id: 'technical_report', name: 'Technical Report', desc: 'Detailed methodology and findings' },
      { id: 'executive_summary', name: 'Executive Summary', desc: 'One-page high-level overview' },
      { id: 'regulatory_impact', name: 'Regulatory Impact Assessment', desc: 'Cost-benefit and impact analysis' },
    ],
    private: [
      { id: 'consulting_memo', name: 'Consulting Memo', desc: 'Strategic recommendations for clients' },
      { id: 'market_analysis', name: 'Market Analysis Report', desc: 'Data-driven market insights' },
      { id: 'investment_brief', name: 'Investment Brief', desc: 'Concise analysis for investors' },
      { id: 'board_presentation', name: 'Board Presentation', desc: 'Executive-level presentation content' },
    ]
  }

  // Handle image upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB')
      return
    }

    setSelectedImage(file)
    setError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle paste for images
  const handlePaste = useCallback((e) => {
    if (inputMethod !== 'image') return
    
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = items[i].getAsFile()
        const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' })
        
        setSelectedImage(file)
        setError('')
        
        const reader = new FileReader()
        reader.onload = (event) => {
          setImagePreview(event.target.result)
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }, [inputMethod])

  const handleAnalyze = async () => {
    if (inputMethod === 'text' && !regressionResults.trim()) {
      setError('Please enter your regression results')
      return
    }
    
    if (inputMethod === 'image' && !selectedImage) {
      setError('Please upload an image of your regression results')
      return
    }

    setLoading(true)
    setError('')
    setInterpretation(null)

    try {
      let prompt = ''
      let imageData = null

      if (inputMethod === 'image' && selectedImage) {
        // Convert image to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result.split(',')[1])
          reader.readAsDataURL(selectedImage)
        })
        imageData = {
          base64,
          type: selectedImage.type
        }
      }

      const resultsSection = inputMethod === 'text' 
        ? "## Regression Results:\n" + regressionResults 
        : "## Regression Results:\n[See the attached image of regression output]"
      
      const contextSection = researchContext 
        ? "\n\n## Research Context:\n" + researchContext 
        : ""

      prompt = `You are an expert econometrician and policy researcher. Analyze the following regression results and provide a comprehensive interpretation suitable for an academic paper.

${resultsSection}${contextSection}

## Please provide a detailed analysis covering ALL of the following sections:

### 1. Results Interpretation
- Interpret each coefficient (magnitude, direction, significance)
- Explain the economic/practical significance (not just statistical significance)
- Discuss the model fit (R-squared, F-statistic if available)
- Note any coefficients that are unexpectedly signed or insignificant

### 2. Identification Threats
- Discuss potential endogeneity concerns (omitted variable bias, reverse causality, measurement error)
- Evaluate the identification strategy's strengths and weaknesses
- Suggest potential robustness checks or alternative specifications
- Discuss selection bias concerns if applicable

### 3. Policy Implications
- What policy recommendations can be drawn from these results?
- Quantify the policy-relevant effect sizes where possible
- Discuss the practical significance for policymakers
- Note any caveats for policy interpretation

### 4. External Validity
- Discuss the generalizability of these findings
- What populations/contexts might these results apply to?
- What are the limitations for external validity?
- Suggest how future research could address external validity concerns

### 5. Suggested Paper Language
- Provide 2-3 paragraphs of draft text that could be used in a paper's results section
- Use appropriate academic language and hedging
- Include proper interpretation of statistical significance

Please format your response as JSON with the following structure:
{
  "resultsInterpretation": {
    "summary": "Brief overall summary",
    "coefficients": [
      {
        "variable": "variable name",
        "interpretation": "detailed interpretation"
      }
    ],
    "modelFit": "discussion of model fit",
    "concerns": "any notable concerns"
  },
  "identificationThreats": {
    "endogeneity": "discussion of endogeneity concerns",
    "omittedVariables": "potential omitted variables",
    "reverseCausality": "reverse causality concerns",
    "measurementError": "measurement error issues",
    "robustnessChecks": ["suggested check 1", "suggested check 2"]
  },
  "policyImplications": {
    "mainFindings": "key policy-relevant findings",
    "recommendations": ["recommendation 1", "recommendation 2"],
    "caveats": "important caveats for policymakers",
    "effectSizes": "policy-relevant effect sizes"
  },
  "externalValidity": {
    "generalizability": "discussion of generalizability",
    "applicableContexts": "where results might apply",
    "limitations": "limitations for external validity",
    "futureResearch": "suggestions for future research"
  },
  "suggestedPaperLanguage": "2-3 paragraphs of draft text for a paper"
}`

      const systemMessage = `You are a senior econometrician and policy researcher with extensive experience publishing in top economics journals. You excel at interpreting regression results, identifying potential threats to identification, and translating findings into policy-relevant insights. Always provide nuanced, academically rigorous analysis. Respond only with valid JSON.`

      let response
      if (imageData) {
        // Use vision API for image input
        response = await callChatGPT(prompt, systemMessage, imageData)
      } else {
        response = await callChatGPT(prompt, systemMessage)
      }
      
      // Parse the response
      let content = response.content || ''
      let parsed = null

      // Try to extract JSON
      try {
        parsed = JSON.parse(content)
      } catch {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1].trim())
          } catch {}
        }
        
        if (!parsed) {
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
              parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1))
            } catch {}
          }
        }
      }

      if (parsed) {
        setInterpretation(parsed)
      } else {
        // Fallback: show raw content
        setInterpretation({
          rawContent: content,
          parseError: true
        })
      }

    } catch (err) {
      console.error('Error analyzing results:', err)
      setError('Failed to analyze results. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setRegressionResults('')
    setResearchContext('')
    setSelectedImage(null)
    setImagePreview(null)
    setInterpretation(null)
    setGeneratedReport(null)
    setReportTitle('')
    setKeyFindings('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Generate professional report
  const handleGenerateReport = async () => {
    if (inputMethod === 'text' && !regressionResults.trim()) {
      setError('Please enter your analysis results')
      return
    }
    
    if (inputMethod === 'image' && !selectedImage) {
      setError('Please upload an image of your results')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedReport(null)

    try {
      let imageData = null

      if (inputMethod === 'image' && selectedImage) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result.split(',')[1])
          reader.readAsDataURL(selectedImage)
        })
        imageData = {
          base64,
          type: selectedImage.type
        }
      }

      const resultsSection = inputMethod === 'text' 
        ? regressionResults 
        : "[See the attached image of analysis results]"

      const audienceContext = targetAudience === 'government' 
        ? `Target Audience: Government officials, policymakers, and regulatory bodies.
Writing Style: Formal, objective, policy-focused. Emphasize public interest, societal impact, and regulatory implications.
Avoid: Jargon without explanation, overly technical language without context.`
        : `Target Audience: Private sector executives, investors, consultants, and business stakeholders.
Writing Style: Professional, strategic, action-oriented. Emphasize ROI, competitive advantage, and business implications.
Avoid: Bureaucratic language, unnecessary hedging.`

      const reportTypeInfo = reportTypes[targetAudience].find(r => r.id === reportType)

      const prompt = `You are an expert policy analyst and professional report writer. Generate a ${reportTypeInfo.name} based on the following empirical analysis results.

## Analysis Results:
${resultsSection}

${reportTitle ? `## Report Title: ${reportTitle}` : ''}

${keyFindings ? `## Key Findings to Emphasize:\n${keyFindings}` : ''}

${researchContext ? `## Research Context:\n${researchContext}` : ''}

## Report Type: ${reportTypeInfo.name}
${reportTypeInfo.desc}

## ${audienceContext}

## Your Task:
Generate a professional-grade ${reportTypeInfo.name} that:
1. Is immediately usable without significant editing
2. Follows industry standards for ${targetAudience === 'government' ? 'government/policy' : 'private sector/consulting'} reports
3. Translates technical findings into actionable insights
4. Uses appropriate formatting, headers, and structure
5. Includes proper citations format where needed (leave placeholders)

## Output Format:
Respond in JSON with:
{
  "title": "Report title",
  "textVersion": "Complete report in plain text with markdown formatting",
  "latexVersion": "Complete report in LaTeX format ready for compilation",
  "wordCount": approximate word count,
  "sections": ["list of main sections included"]
}

Generate the complete professional report now.`

      const systemMessage = `You are a senior policy analyst and professional writer with experience preparing reports for ${targetAudience === 'government' ? 'government agencies, congressional committees, and regulatory bodies' : 'Fortune 500 companies, consulting firms, and investment banks'}. Your reports are known for clarity, professionalism, and actionable insights. Respond only with valid JSON.`

      let response
      if (imageData) {
        response = await callChatGPT(prompt, systemMessage, imageData)
      } else {
        response = await callChatGPT(prompt, systemMessage)
      }

      let content = response.content || ''
      let parsed = null

      try {
        parsed = JSON.parse(content)
      } catch {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1].trim())
          } catch {}
        }
        
        if (!parsed) {
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
              parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1))
            } catch {}
          }
        }
      }

      if (parsed) {
        setGeneratedReport(parsed)
      } else {
        setGeneratedReport({
          textVersion: content,
          latexVersion: '',
          parseError: true
        })
      }

    } catch (err) {
      console.error('Error generating report:', err)
      setError('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = (format) => {
    if (!generatedReport) return
    
    const content = format === 'latex' ? generatedReport.latexVersion : generatedReport.textVersion
    const ext = format === 'latex' ? 'tex' : 'md'
    const mimeType = format === 'latex' ? 'text/x-latex' : 'text/markdown'
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedReport.title?.replace(/\s+/g, '_') || 'report'}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySection = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Failed to copy'))
  }

  const handleDownloadAll = () => {
    if (!interpretation) return
    
    let content = '# Regression Results Interpretation\n\n'
    
    if (interpretation.resultsInterpretation) {
      content += '## 1. Results Interpretation\n\n'
      content += interpretation.resultsInterpretation.summary + '\n\n'
      if (interpretation.resultsInterpretation.coefficients) {
        interpretation.resultsInterpretation.coefficients.forEach(c => {
          content += `**${c.variable}**: ${c.interpretation}\n\n`
        })
      }
      content += `**Model Fit**: ${interpretation.resultsInterpretation.modelFit}\n\n`
    }
    
    if (interpretation.identificationThreats) {
      content += '## 2. Identification Threats\n\n'
      content += `**Endogeneity**: ${interpretation.identificationThreats.endogeneity}\n\n`
      content += `**Omitted Variables**: ${interpretation.identificationThreats.omittedVariables}\n\n`
      content += `**Reverse Causality**: ${interpretation.identificationThreats.reverseCausality}\n\n`
      if (interpretation.identificationThreats.robustnessChecks) {
        content += '**Suggested Robustness Checks**:\n'
        interpretation.identificationThreats.robustnessChecks.forEach(c => {
          content += `- ${c}\n`
        })
        content += '\n'
      }
    }
    
    if (interpretation.policyImplications) {
      content += '## 3. Policy Implications\n\n'
      content += interpretation.policyImplications.mainFindings + '\n\n'
      if (interpretation.policyImplications.recommendations) {
        content += '**Recommendations**:\n'
        interpretation.policyImplications.recommendations.forEach(r => {
          content += `- ${r}\n`
        })
        content += '\n'
      }
      content += `**Caveats**: ${interpretation.policyImplications.caveats}\n\n`
    }
    
    if (interpretation.externalValidity) {
      content += '## 4. External Validity\n\n'
      content += `**Generalizability**: ${interpretation.externalValidity.generalizability}\n\n`
      content += `**Limitations**: ${interpretation.externalValidity.limitations}\n\n`
      content += `**Future Research**: ${interpretation.externalValidity.futureResearch}\n\n`
    }
    
    if (interpretation.suggestedPaperLanguage) {
      content += '## 5. Suggested Paper Language\n\n'
      content += interpretation.suggestedPaperLanguage + '\n'
    }

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'regression_interpretation.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50" onPaste={handlePaste}>
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
            <h1 className="text-2xl font-bold text-gray-800">Policy Interpretation AI</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => { setMode('interpret'); setGeneratedReport(null); }}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition ${
                mode === 'interpret'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="text-lg mb-1">📊 Result Interpret</div>
              <div className="text-sm opacity-80">Analyze regression results & get interpretation</div>
            </button>
            <button
              onClick={() => { setMode('report'); setInterpretation(null); }}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition ${
                mode === 'report'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="text-lg mb-1">📄 Report Generator</div>
              <div className="text-sm opacity-80">Generate professional reports for government/private sector</div>
            </button>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white mb-8">
          {mode === 'interpret' ? (
            <>
              <h2 className="text-2xl font-bold mb-2">"I can run regressions, but I can't interpret them"</h2>
              <p className="text-violet-100">
                Upload your regression results and get comprehensive interpretation: coefficient explanations, 
                identification threats, policy implications, and external validity discussion.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Generate Professional-Grade Reports</h2>
              <p className="text-violet-100">
                Transform your empirical analysis into polished reports for government agencies or private sector stakeholders. 
                Get both plain text and LaTeX formats.
              </p>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Input Method Toggle */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Input Method</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    inputMethod === 'text'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📝 Paste Text
                </button>
                <button
                  onClick={() => setInputMethod('image')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    inputMethod === 'image'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📷 Upload Image
                </button>
              </div>
            </div>

            {/* Text Input */}
            {inputMethod === 'text' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Regression Results</h3>
                <textarea
                  value={regressionResults}
                  onChange={(e) => setRegressionResults(e.target.value)}
                  placeholder="Paste your regression output here (from Stata, R, Python, etc.)...

Example:
                            Estimate   Std. Error   t value   Pr(>|t|)    
(Intercept)                  2.3456      0.4521     5.187    3.2e-06 ***
treatment                    0.8912      0.2134     4.176    0.00012 ***
age                         -0.0234      0.0089    -2.629    0.01123 *  
education                    0.1567      0.0456     3.437    0.00098 ***

R-squared: 0.4523
Observations: 1,234"
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Image Input */}
            {inputMethod === 'image' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📷 Upload Regression Output</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="regression-image-upload"
                  />
                  <label
                    htmlFor="regression-image-upload"
                    className="cursor-pointer inline-block px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    Choose Image
                  </label>
                  
                  {imagePreview && (
                    <div className="mt-4">
                      <img
                        src={imagePreview}
                        alt="Regression output"
                        className="max-w-full max-h-64 mx-auto rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                  
                  {!imagePreview && (
                    <p className="mt-4 text-gray-500 text-sm">
                      Or press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+V</kbd> / <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+V</kbd> to paste a screenshot
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Research Context (Optional) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">🔬 Research Context (Optional)</h3>
              <p className="text-sm text-gray-500 mb-4">
                Providing context helps generate more relevant {mode === 'interpret' ? 'interpretations' : 'reports'}
              </p>
              <textarea
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                placeholder="Describe your research question, data source, identification strategy, etc.

Example:
- Research Question: Effect of a job training program on wages
- Data: Administrative records from 2015-2020
- Identification: Difference-in-differences using program rollout
- Treatment: Participation in job training program
- Outcome: Log hourly wages"
                className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Report Generator Options */}
            {mode === 'report' && (
              <>
                {/* Target Audience */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Target Audience</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => { setTargetAudience('government'); setReportType('policy_brief'); }}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        targetAudience === 'government'
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">🏛️</div>
                      <div className="font-semibold">Government</div>
                      <div className="text-sm text-gray-500">Policy briefs, regulatory reports</div>
                    </button>
                    <button
                      onClick={() => { setTargetAudience('private'); setReportType('consulting_memo'); }}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        targetAudience === 'private'
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">🏢</div>
                      <div className="font-semibold">Private Sector</div>
                      <div className="text-sm text-gray-500">Consulting memos, market analysis</div>
                    </button>
                  </div>
                </div>

                {/* Report Type */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Report Type</h3>
                  <div className="space-y-2">
                    {reportTypes[targetAudience].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setReportType(type.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition ${
                          reportType === type.id
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        <div className="font-semibold">{type.name}</div>
                        <div className="text-sm text-gray-500">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Report Details */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Report Details (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="e.g., Impact Assessment of Job Training Programs"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key Findings to Emphasize</label>
                      <textarea
                        value={keyFindings}
                        onChange={(e) => setKeyFindings(e.target.value)}
                        placeholder="List the main findings you want to highlight..."
                        className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={mode === 'interpret' ? handleAnalyze : handleGenerateReport}
                disabled={loading || (inputMethod === 'text' ? !regressionResults.trim() : !selectedImage)}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {mode === 'interpret' ? 'Analyzing...' : 'Generating Report...'}
                  </span>
                ) : (
                  mode === 'interpret' ? '🔍 Generate Interpretation' : '📄 Generate Report'
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
            {mode === 'interpret' && interpretation && !interpretation.parseError && (
              <>
                {/* Download All Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleDownloadAll}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    ⬇️ Download Full Report
                  </button>
                </div>

                {/* Results Interpretation */}
                {interpretation.resultsInterpretation && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">📊 Results Interpretation</h3>
                      <button
                        onClick={() => handleCopySection(JSON.stringify(interpretation.resultsInterpretation, null, 2))}
                        className="text-sm text-violet-600 hover:text-violet-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 font-medium">{interpretation.resultsInterpretation.summary}</p>
                      
                      {interpretation.resultsInterpretation.coefficients && (
                        <div className="mt-4 space-y-3">
                          {interpretation.resultsInterpretation.coefficients.map((coef, idx) => (
                            <div key={idx} className="border-l-4 border-violet-400 pl-4 py-1">
                              <span className="font-semibold text-violet-700">{coef.variable}:</span>
                              <p className="text-gray-600 mt-1">{coef.interpretation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {interpretation.resultsInterpretation.modelFit && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <span className="font-semibold">Model Fit: </span>
                          <span className="text-gray-600">{interpretation.resultsInterpretation.modelFit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Identification Threats */}
                {interpretation.identificationThreats && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">⚠️ Identification Threats</h3>
                      <button
                        onClick={() => handleCopySection(JSON.stringify(interpretation.identificationThreats, null, 2))}
                        className="text-sm text-violet-600 hover:text-violet-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                        <span className="font-semibold text-amber-800">Endogeneity: </span>
                        <p className="text-amber-700 mt-1">{interpretation.identificationThreats.endogeneity}</p>
                      </div>
                      
                      <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                        <span className="font-semibold text-orange-800">Omitted Variables: </span>
                        <p className="text-orange-700 mt-1">{interpretation.identificationThreats.omittedVariables}</p>
                      </div>
                      
                      <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                        <span className="font-semibold text-red-800">Reverse Causality: </span>
                        <p className="text-red-700 mt-1">{interpretation.identificationThreats.reverseCausality}</p>
                      </div>
                      
                      {interpretation.identificationThreats.robustnessChecks && (
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                          <span className="font-semibold text-blue-800">Suggested Robustness Checks:</span>
                          <ul className="mt-2 space-y-1">
                            {interpretation.identificationThreats.robustnessChecks.map((check, idx) => (
                              <li key={idx} className="text-blue-700 flex items-start gap-2">
                                <span>•</span>
                                <span>{check}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Policy Implications */}
                {interpretation.policyImplications && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">🏛️ Policy Implications</h3>
                      <button
                        onClick={() => handleCopySection(JSON.stringify(interpretation.policyImplications, null, 2))}
                        className="text-sm text-violet-600 hover:text-violet-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-gray-700">{interpretation.policyImplications.mainFindings}</p>
                      
                      {interpretation.policyImplications.recommendations && (
                        <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                          <span className="font-semibold text-green-800">Recommendations:</span>
                          <ul className="mt-2 space-y-1">
                            {interpretation.policyImplications.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-green-700 flex items-start gap-2">
                                <span>✓</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {interpretation.policyImplications.caveats && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="font-semibold">⚠️ Caveats: </span>
                          <span className="text-gray-600">{interpretation.policyImplications.caveats}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* External Validity */}
                {interpretation.externalValidity && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">🌍 External Validity</h3>
                      <button
                        onClick={() => handleCopySection(JSON.stringify(interpretation.externalValidity, null, 2))}
                        className="text-sm text-violet-600 hover:text-violet-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-gray-700">Generalizability: </span>
                        <p className="text-gray-600 mt-1">{interpretation.externalValidity.generalizability}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Limitations: </span>
                        <p className="text-gray-600 mt-1">{interpretation.externalValidity.limitations}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Future Research: </span>
                        <p className="text-gray-600 mt-1">{interpretation.externalValidity.futureResearch}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Paper Language */}
                {interpretation.suggestedPaperLanguage && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">✍️ Suggested Paper Language</h3>
                      <button
                        onClick={() => handleCopySection(interpretation.suggestedPaperLanguage)}
                        className="text-sm text-violet-600 hover:text-violet-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {interpretation.suggestedPaperLanguage}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Raw content fallback */}
            {mode === 'interpret' && interpretation && interpretation.parseError && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Analysis Results</h3>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {interpretation.rawContent}
                  </pre>
                </div>
              </div>
            )}

            {/* Report Generator Results */}
            {mode === 'report' && generatedReport && (
              <>
                {/* Report Header & Download */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{generatedReport.title || 'Generated Report'}</h3>
                      {generatedReport.wordCount && (
                        <p className="text-sm text-gray-500 mt-1">~{generatedReport.wordCount} words</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadReport('text')}
                        className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition text-sm font-medium"
                      >
                        ⬇️ Download Text
                      </button>
                      <button
                        onClick={() => handleDownloadReport('latex')}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm font-medium"
                      >
                        ⬇️ Download LaTeX
                      </button>
                    </div>
                  </div>
                  
                  {generatedReport.sections && (
                    <div className="flex flex-wrap gap-2">
                      {generatedReport.sections.map((section, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          {section}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Format Toggle */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReportFormat('text')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        reportFormat === 'text'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📝 Plain Text
                    </button>
                    <button
                      onClick={() => setReportFormat('latex')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        reportFormat === 'latex'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📐 LaTeX
                    </button>
                  </div>
                </div>

                {/* Report Content */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      {reportFormat === 'text' ? 'Report Content' : 'LaTeX Source'}
                    </h3>
                    <button
                      onClick={() => handleCopySection(reportFormat === 'text' ? generatedReport.textVersion : generatedReport.latexVersion)}
                      className="text-sm text-violet-600 hover:text-violet-700"
                    >
                      📋 Copy
                    </button>
                  </div>
                  
                  {reportFormat === 'text' ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-gray-50 p-6 rounded-lg whitespace-pre-wrap text-gray-700 leading-relaxed max-h-[600px] overflow-y-auto">
                        {generatedReport.textVersion}
                      </div>
                    </div>
                  ) : (
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-[600px] whitespace-pre-wrap">
                      {generatedReport.latexVersion || 'LaTeX version not available'}
                    </pre>
                  )}
                </div>
              </>
            )}

            {/* Empty State */}
            {((mode === 'interpret' && !interpretation) || (mode === 'report' && !generatedReport)) && !loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">{mode === 'interpret' ? '📝' : '📄'}</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {mode === 'interpret' ? 'Interpretation Will Appear Here' : 'Report Will Appear Here'}
                </h3>
                <p className="text-gray-500">
                  {mode === 'interpret' 
                    ? 'Enter your regression results and click "Generate Interpretation" to get a comprehensive analysis.'
                    : 'Enter your analysis results, select report type, and click "Generate Report" to create a professional document.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PolicyInterpretation
