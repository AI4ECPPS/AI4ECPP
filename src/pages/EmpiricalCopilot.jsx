import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT, callChatGPTStream } from '../utils/api'
import api from '../utils/api'
import Logo from '../components/Logo'
import ReactMarkdown from 'react-markdown'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'

const DEFAULT_KEY_POINTS = [
  'Check for heteroskedasticity using Breusch-Pagan test or White test',
  'Verify normality of residuals (important for inference)',
  'Test for multicollinearity (VIF > 10 indicates problems)',
  'Consider robust standard errors if heteroskedasticity is present',
  'Ensure exogeneity assumption: E[ε|X] = 0',
  'Check for omitted variable bias',
  'Verify sample size is adequate for your model',
  'Consider fixed effects if using panel data'
]

function getSystemMessageAndHint(language) {
  const base = `You are an expert econometrician specializing in ${language} programming for empirical analysis. You must respond with: (1) exactly one markdown code block containing complete, runnable ${language} code; (2) after the code block, a section "## Key knowledge points" with bullet points for assumptions, diagnostic tests, and pitfalls. Do not add other sections before or after.`
  const hints = {
    R: 'Use standard R packages only: e.g. lm, sandwich, lmtest, plm, fixest, broom, AER, car. Avoid non-existent or obscure packages.',
    Python: 'Use standard Python libraries only: pandas, numpy, statsmodels, linearmodels, scipy.stats. Avoid non-standard or rarely used packages.',
    Stata: 'Use standard Stata commands and common ado files. Prefer built-in reg, ivregress, reghdfe, and official/well-documented community commands.'
  }
  const packageHint = hints[language] || ''
  return {
    systemMessage: base + (packageHint ? ` ${packageHint}` : ''),
    packageHint: packageHint ? `Package/library note: ${packageHint}` : ''
  }
}

function parseCodeAndKeyPoints(content) {
  let code = ''
  const codeBlockMatch = content.match(/```[\s\S]*?```/g)
  if (codeBlockMatch) {
    code = codeBlockMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
  } else {
    code = content
  }
  let points = []
  const keySection = content.match(/##\s*Key knowledge points\s*\n([\s\S]+?)(?=\n##|\n```|$)/i)
  if (keySection) {
    const text = keySection[1]
    const list = text.match(/(?:[-•*]|\d+\.)\s*([^\n]+)/g)
    if (list) points = list.slice(0, 10).map(p => p.replace(/^[-•*\d.]\s*/, '').trim())
  }
  if (points.length === 0) {
    const fallback = content.match(/(?:key points?|important|assumptions?|tests?|knowledge points?)[:\s]+([\s\S]+?)(?:\n\n|\n#|$)/i)
    if (fallback) {
      const list = fallback[1].match(/(?:[-•*]|\d+\.)\s*([^\n]+)/g)
      if (list) points = list.slice(0, 10).map(p => p.replace(/^[-•*\d.]\s*/, '').trim())
    }
  }
  return { code, points }
}

function EmpiricalCopilot() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('text') // 'text' or 'image'
  
  // Text-based states
  const [description, setDescription] = useState('')
  
  // Image-based states
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageSource, setImageSource] = useState(null) // 'upload' or 'paste'
  const containerRef = useRef(null)
  
  const [language, setLanguage] = useState('R')
  const [generatedCode, setGeneratedCode] = useState('')
  const [keyPoints, setKeyPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  const applyCodeResult = useCallback((content, lang) => {
    const { code, points } = parseCodeAndKeyPoints(content)
    setGeneratedCode(code || `# ${lang} code will be generated here`)
    setKeyPoints(points.length > 0 ? points : DEFAULT_KEY_POINTS)
  }, [])

  const getDownloadFilename = useCallback(() => {
    const ext = language === 'R' ? 'r' : language === 'Python' ? 'py' : 'do'
    const d = new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const slug = (activeTab === 'text' ? description : '').trim().slice(0, 30).replace(/\s+/g, '-').replace(/[^\w\-]/g, '') || 'analysis'
    return `empirical_${slug}_${dateStr}.${ext}`
  }, [language, activeTab, description])

  const handleDescriptionChange = (e) => {
    const value = limitInputLength(e.target.value, 5000)
    setDescription(value)
  }

  const handleGenerate = async () => {
    setError('')
    const validation = validateAndSanitizeText(description, {
      maxLength: 5000,
      minLength: 10,
      required: true,
      filterProfanity: false
    })
    if (!validation.valid) {
      setError(validation.message || 'Please check your input')
      return
    }
    if (!description.trim()) {
      setError('Please describe your empirical analysis scenario (at least 10 characters).')
      return
    }

    setLoading(true)
    setGeneratedCode('')
    setKeyPoints([])
    const cleanedDescription = validation.cleaned
    const { systemMessage, packageHint } = getSystemMessageAndHint(language)
    const prompt = `Generate ${language} code for the following econometric/empirical analysis scenario:

${cleanedDescription}

Requirements:
1. Provide exactly one markdown code block containing the full, runnable ${language} code (use \`\`\`${language === 'R' ? 'r' : language === 'Python' ? 'python' : 'stata'}\`\`\`). Include data loading, variable preparation, regression, and interpretation.
2. Add clear comments for each step and include standard diagnostic tests (e.g. heteroskedasticity, normality, multicollinearity where relevant).
3. After the code block, add a section titled exactly: ## Key knowledge points
   Under it list bullet points for: important assumptions, tests not to forget, and potential pitfalls.

${packageHint}`

    try {
      try {
        const result = await callChatGPTStream(prompt, systemMessage, () => {})
        const content = (result?.content || '').trim()
        if (content) applyCodeResult(content, language)
        else setError('No response received. Please try again.')
      } catch (streamErr) {
        const msg = streamErr?.message || ''
        if (msg.includes('404')) {
          const response = await callChatGPT(prompt, systemMessage, { temperature: 0.3 })
          const content = response?.content || ''
          if (content) applyCodeResult(content, language)
          else setError('No response received. Please try again.')
        } else throw streamErr
      }
    } catch (err) {
      console.error(err)
      const msg = err?.message || ''
      setError(msg.includes('Network') || err?.request ? 'Network error. Please try again.' : (msg || 'Error generating code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // Process image file (used by both upload and paste)
  const processImageFile = useCallback((file, source = 'upload') => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB')
      return
    }

    setSelectedImage(file)
    setImageSource(source)
    setError('')
    setGeneratedCode('')
    setKeyPoints([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          setError('Image is too small. Please use a higher resolution image.')
          setSelectedImage(null)
          setImageSource(null)
          return
        }
        setImagePreview(event.target.result)
      }
      img.onerror = () => {
        setError('Invalid image file. Please select a valid image.')
        setSelectedImage(null)
        setImageSource(null)
      }
      img.src = event.target.result
    }
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.')
      setSelectedImage(null)
      setImageSource(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processImageFile(file, 'upload')
    }
  }

  // Handle paste event
  const handlePaste = useCallback(async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }

    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = items[i].getAsFile()
        const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' })
        processImageFile(file, 'paste')
        return
      }
    }
  }, [processImageFile])

  // Set up paste event listener
  useEffect(() => {
    const container = containerRef.current
    if (container && activeTab === 'image') {
      container.addEventListener('paste', handlePaste)
      window.addEventListener('paste', handlePaste)
      
      return () => {
        container.removeEventListener('paste', handlePaste)
        window.removeEventListener('paste', handlePaste)
      }
    }
  }, [handlePaste, activeTab])

  // Generate code from image
  const handleGenerateFromImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedCode('')
    setKeyPoints([])

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64Image = event.target.result.split(',')[1]

          if (!base64Image || base64Image.length === 0) {
            setError('Failed to process image. Please try again.')
            setLoading(false)
            return
          }

          // First, convert image to LaTeX using pic-to-latex endpoint
          const latexResponse = await api.post('/pic-to-latex', {
            image: base64Image,
            imageType: selectedImage.type
          })

          const latexFormula = latexResponse.data.latex

          if (!latexFormula || latexFormula.trim().length === 0) {
            setError('Failed to recognize formula from image. Please try again with a clearer image.')
            setLoading(false)
            return
          }

          const { systemMessage, packageHint } = getSystemMessageAndHint(language)
          const prompt = `Convert the following econometric formula (from a research paper) into ${language} code:

${latexFormula}

Requirements:
1. Provide exactly one markdown code block with full, runnable ${language} code: data/simulation setup, variable preparation, formula implementation, and basic diagnostics.
2. Add clear comments for each step. After the code block, add a section titled exactly: ## Key knowledge points
   with bullet points for assumptions, tests, and pitfalls.

${packageHint}`

          try {
            const result = await callChatGPTStream(prompt, systemMessage, () => {})
            const content = (result?.content || '').trim()
            if (content) applyCodeResult(content, language)
            else setError('No response received. Please try again.')
          } catch (streamErr) {
            const msg = streamErr?.message || ''
            if (msg.includes('404')) {
              const response = await callChatGPT(prompt, systemMessage, { temperature: 0.3 })
              const content = response?.content || ''
              if (content) applyCodeResult(content, language)
              else setError('No response received. Please try again.')
            } else throw streamErr
          }
        } catch (err) {
          console.error('Error generating code from image:', err)
          if (err?.response?.data) {
            const ed = err.response.data
            setError(ed.message || ed.error || 'Failed to generate code. Please try again.')
          } else if (err?.request) {
            setError('Network error. Please try again.')
          } else {
            setError(err?.message || 'An unexpected error occurred. Please try again.')
          }
        } finally {
          setLoading(false)
        }
      }
      
      reader.onerror = () => {
        setError('Failed to read image file. Please try again.')
        setLoading(false)
      }
      
      reader.readAsDataURL(selectedImage)
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred while processing the image. Please try again.')
      setLoading(false)
    }
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setGeneratedCode('')
    setKeyPoints([])
    setError('')
    if (tab === 'image') {
      setDescription('')
    } else {
      setSelectedImage(null)
      setImagePreview(null)
      setImageSource(null)
    }
  }

  const handleClear = () => {
    if (activeTab === 'text') {
      setDescription('')
    } else {
      setSelectedImage(null)
      setImagePreview(null)
      setImageSource(null)
      const fileInput = document.getElementById('formula-image-upload')
      if (fileInput) {
        fileInput.value = ''
      }
    }
    setGeneratedCode('')
    setKeyPoints([])
    setError('')
    setCopyFeedback('')
  }

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = getDownloadFilename()
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyCode = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        setCopyFeedback('Copied!')
        setTimeout(() => setCopyFeedback(''), 2000)
      })
      .catch(() => setError('Copy failed. Please select and copy manually.'))
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={containerRef} tabIndex={0}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Empirical Copilot</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Mode prompt */}
        <div className="mb-6 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-white" style={{ backgroundColor: '#5B5BF5' }}>
          <p className="text-indigo-100 text-sm sm:text-base">
            For more complete features (e.g. advanced workflows, integration with other tools), try <strong>Professional Mode</strong>.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profession-dashboard')}
            className="shrink-0 px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Go to Professional Mode →
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 shrink-0" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('text')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'text'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📝 Text Description
            </button>
            <button
              onClick={() => handleTabChange('image')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'image'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📷 Formula Screenshot
            </button>
          </div>
        </div>

        {/* Text-based Input Section */}
        {activeTab === 'text' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Describe Your Analysis Scenario</h2>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Example: I want to analyze the effect of a policy intervention on economic outcomes using a difference-in-differences approach with panel data from 2010-2020..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none mb-4"
              maxLength={5000}
            />
            
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700">Programming Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="R">R</option>
                <option value="Python">Python</option>
                <option value="Stata">Stata</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Code...' : 'Generate Code'}
              </button>
              {description && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image-based Input Section */}
        {activeTab === 'image' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Upload Formula Screenshot</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload or paste a screenshot of a formula from a research paper, and we'll generate code to implement it.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              For best results use a clear, cropped image of the formula.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="formula-image-upload"
              />
              <label
                htmlFor="formula-image-upload"
                className="cursor-pointer inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Choose Image
              </label>
              {selectedImage && (
                <div className="mt-4">
                  <p className="text-gray-600 mb-2">
                    {imageSource === 'paste' ? '📋 Pasted image' : `Selected: ${selectedImage.name}`}
                  </p>
                  {imagePreview && (
                    <div className="mt-4 inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-64 rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              )}
              {!selectedImage && (
                <p className="mt-4 text-gray-500 text-sm">
                  Or press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+V</kbd> / <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+V</kbd> to paste a screenshot
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700">Programming Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="R">R</option>
                <option value="Python">Python</option>
                <option value="Stata">Stata</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateFromImage}
                disabled={!selectedImage || loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Code...' : 'Generate Code from Formula'}
              </button>
              {selectedImage && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading placeholder */}
        {loading && !generatedCode && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Generating code…</h2>
            <p className="text-gray-500 mb-4">Code and key points will appear here when ready.</p>
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500">Analyzing…</span>
            </div>
          </div>
        )}

        {/* Generated Code */}
        {generatedCode && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h2 className="text-xl font-bold">Generated {language} Code</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  {copyFeedback === 'Copied!' ? copyFeedback : 'Copy code'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Download Code
                </button>
              </div>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">{generatedCode}</pre>
            </div>
          </div>
        )}

        {/* Key Knowledge Points */}
        {keyPoints.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Important Knowledge Points & Assumptions</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800 font-semibold mb-2">⚠️ Don't Forget These Critical Checks:</p>
            </div>
            <ul className="space-y-3">
              {keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-indigo-600 font-bold mt-1 shrink-0">•</span>
                  <span className="text-gray-700 prose prose-sm max-w-none [&>p]:my-0 [&>p]:inline">
                    <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>{point}</ReactMarkdown>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

export default EmpiricalCopilot

