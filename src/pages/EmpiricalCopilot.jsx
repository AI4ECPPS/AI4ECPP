import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import api from '../utils/api'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'

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
  
  // Shared states
  const [language, setLanguage] = useState('R')
  const [generatedCode, setGeneratedCode] = useState('')
  const [keyPoints, setKeyPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDescriptionChange = (e) => {
    const value = limitInputLength(e.target.value, 5000)
    setDescription(value)
  }

  const handleGenerate = async () => {
    // 验证输入 - 拒绝包含脏话的输入
    const validation = validateAndSanitizeText(description, {
      maxLength: 5000,
      minLength: 10,
      required: true,
      filterProfanity: false // 直接拒绝脏话而不是过滤
    })

    if (!validation.valid) {
      alert(validation.message || 'Please check your input')
      return
    }

    if (!description.trim()) {
      alert('Please describe your empirical analysis scenario')
      return
    }

    setLoading(true)
    try {
      // 使用清理后的输入
      const cleanedDescription = validation.cleaned
      const prompt = `Generate ${language} code for the following econometric/empirical analysis scenario:

${cleanedDescription}

Please provide:
1. Complete, runnable code with proper structure
2. Include data loading, variable preparation, regression analysis, and results interpretation
3. Add comments explaining each step
4. Include common diagnostic tests and assumptions checks

Also identify key knowledge points including:
- Important assumptions that must be satisfied
- Tests that should not be forgotten
- Potential pitfalls to avoid`

      const response = await callChatGPT(prompt, `You are an expert econometrician specializing in ${language} programming for empirical analysis.`)
      
      const content = response.content || ''
      
      // Extract code from response (look for code blocks)
      let generatedCode = ''
      const codeBlockMatch = content.match(/```[\s\S]*?```/g)
      if (codeBlockMatch) {
        generatedCode = codeBlockMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
      } else {
        // If no code block, use the full content
        generatedCode = content
      }
      
      // Extract key points
      const keyPointsSection = content.match(/(?:key points?|important|assumptions?|tests?|knowledge points?)[:\s]+([\s\S]+?)(?:\n\n|\n#|$)/i)
      let extractedPoints = []
      if (keyPointsSection) {
        const pointsText = keyPointsSection[1]
        const pointsList = pointsText.match(/(?:[-•*]|\d+\.)\s*([^\n]+)/g)
        if (pointsList) {
          extractedPoints = pointsList.slice(0, 10).map(p => p.replace(/^[-•*\d.]\s*/, '').trim())
        }
      }
      
      // Fallback key points
      const defaultKeyPoints = [
        'Check for heteroskedasticity using Breusch-Pagan test or White test',
        'Verify normality of residuals (important for inference)',
        'Test for multicollinearity (VIF > 10 indicates problems)',
        'Consider robust standard errors if heteroskedasticity is present',
        'Ensure exogeneity assumption: E[ε|X] = 0',
        'Check for omitted variable bias',
        'Verify sample size is adequate for your model',
        'Consider fixed effects if using panel data'
      ]

      setGeneratedCode(generatedCode || `# ${language} code will be generated here`)
      setKeyPoints(extractedPoints.length > 0 ? extractedPoints : defaultKeyPoints)
    } catch (error) {
      alert('Error generating code. Please try again.')
      console.error(error)
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

          // Then, generate code based on the LaTeX formula
          const prompt = `Generate ${language} code to implement the following econometric formula from a research paper:

${latexFormula}

Requirements:
1. Provide complete, runnable ${language} code
2. Include data loading/simulation, variable preparation, and implementation of the formula
3. Add detailed comments explaining each step and the econometric concepts
4. Include appropriate diagnostic tests and assumptions checks
5. Use standard ${language} packages and libraries
6. Make the code production-ready and well-structured

Also identify key knowledge points including:
- Important assumptions that must be satisfied
- Tests that should not be forgotten
- Potential pitfalls to avoid
- Interpretation of results`

          const systemMessage = `You are an expert econometrician specializing in ${language} programming. Your task is to convert econometric formulas from research papers into working code. You have deep knowledge of:
- Econometric methods and their implementation in ${language}
- Standard ${language} packages for econometrics
- Best practices for empirical analysis
- Diagnostic tests and model validation

Generate clean, well-commented, production-ready code that accurately implements the given formula.`

          const response = await callChatGPT(prompt, systemMessage)
          
          const content = response.content || ''
          
          // Extract code from response
          let generatedCode = ''
          const codeBlockMatch = content.match(/```[\s\S]*?```/g)
          if (codeBlockMatch) {
            generatedCode = codeBlockMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
          } else {
            generatedCode = content
          }
          
          // Extract key points
          const keyPointsSection = content.match(/(?:key points?|important|assumptions?|tests?|knowledge points?)[:\s]+([\s\S]+?)(?:\n\n|\n#|$)/i)
          let extractedPoints = []
          if (keyPointsSection) {
            const pointsText = keyPointsSection[1]
            const pointsList = pointsText.match(/(?:[-•*]|\d+\.)\s*([^\n]+)/g)
            if (pointsList) {
              extractedPoints = pointsList.slice(0, 10).map(p => p.replace(/^[-•*\d.]\s*/, '').trim())
            }
          }
          
          const defaultKeyPoints = [
            'Check for heteroskedasticity using Breusch-Pagan test or White test',
            'Verify normality of residuals (important for inference)',
            'Test for multicollinearity (VIF > 10 indicates problems)',
            'Consider robust standard errors if heteroskedasticity is present',
            'Ensure exogeneity assumption: E[ε|X] = 0',
            'Check for omitted variable bias',
            'Verify sample size is adequate for your model',
            'Consider fixed effects if using panel data'
          ]

          setGeneratedCode(generatedCode || `# ${language} code will be generated here`)
          setKeyPoints(extractedPoints.length > 0 ? extractedPoints : defaultKeyPoints)
        } catch (err) {
          console.error('Error generating code from image:', err)
          
          if (err.response) {
            const errorData = err.response.data
            setError(errorData.message || errorData.error || 'Failed to generate code. Please try again.')
          } else if (err.request) {
            setError('Network error. Please check your internet connection and try again.')
          } else {
            setError('An unexpected error occurred. Please try again.')
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
  }

  const handleDownload = () => {
    const extension = language === 'R' ? 'r' : language === 'Python' ? 'py' : 'do'
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empirical_analysis.${extension}`
    a.click()
    URL.revokeObjectURL(url)
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

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

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

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

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

        {/* Generated Code */}
        {generatedCode && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Generated {language} Code</h2>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Download Code
              </button>
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
                  <span className="text-indigo-600 font-bold mt-1">•</span>
                  <span className="text-gray-700">{point}</span>
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

