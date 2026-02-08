import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { callChatGPT } from '../utils/api'
import Logo from '../components/Logo'
import { limitInputLength } from '../utils/security'

function PicToLatex() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('picture') // 'picture' or 'word'
  
  // Picture to LaTeX states
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageSource, setImageSource] = useState(null) // 'upload' or 'paste'
  
  // Word to LaTeX states
  const [description, setDescription] = useState('')
  
  // Shared states
  const [latexCode, setLatexCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const containerRef = useRef(null)

  // Process image file (used by both upload and paste)
  const processImageFile = useCallback((file, source = 'upload') => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB')
      return
    }

    setSelectedImage(file)
    setImageSource(source)
    setError('')
    setLatexCode('')
    setCopied(false)

    // Create preview and check image quality
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Check image dimensions
        if (img.width < 50 || img.height < 50) {
          setError('Image is too small. Please use a higher resolution image for better accuracy.')
          setSelectedImage(null)
          setImageSource(null)
          return
        }
        
        // Check if image is too large (might cause issues)
        if (img.width > 4000 || img.height > 4000) {
          console.warn('Image is very large, this might slow down processing')
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
    // Only handle paste if we're not in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }

    const items = e.clipboardData?.items
    if (!items) return

    // Look for image in clipboard
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = items[i].getAsFile()
        
        // Convert blob to File object
        const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' })
        processImageFile(file, 'paste')
        return
      }
    }
  }, [processImageFile])

  // Set up paste event listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('paste', handlePaste)
      // Also listen on window for better coverage
      window.addEventListener('paste', handlePaste)
      
      return () => {
        container.removeEventListener('paste', handlePaste)
        window.removeEventListener('paste', handlePaste)
      }
    }
  }, [handlePaste])

  const handleConvert = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError('')
    setCopied(false)

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64Image = event.target.result.split(',')[1] // Remove data:image/...;base64, prefix

          // Validate base64
          if (!base64Image || base64Image.length === 0) {
            setError('Failed to process image. Please try again.')
            setLoading(false)
            return
          }

          // Call backend API
          const response = await api.post('/pic-to-latex', {
            image: base64Image,
            imageType: selectedImage.type
          })

          if (response.data.latex) {
            const latex = response.data.latex.trim()
            if (latex.length > 0) {
              setLatexCode(latex)
              setError('') // Clear any previous errors
            } else {
              setError('The AI returned empty LaTeX code. Please try again with a clearer image.')
            }
          } else {
            setError('Failed to generate LaTeX code. The server did not return valid LaTeX.')
            console.error('API response:', response.data)
          }
        } catch (err) {
          console.error('API error:', err)
          
          // More detailed error messages
          if (err.response) {
            const errorData = err.response.data
            setError(errorData.message || errorData.error || 'Failed to convert image to LaTeX. Please try again.')
            
            // Log for debugging
            console.error('Error details:', {
              status: err.response.status,
              data: errorData
            })
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

  const handleCopy = () => {
    if (latexCode) {
      navigator.clipboard.writeText(latexCode)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          setError('Failed to copy to clipboard')
        })
    }
  }

  const handleClear = () => {
    if (activeTab === 'picture') {
      setSelectedImage(null)
      setImagePreview(null)
      setImageSource(null)
      // Reset file input
      const fileInput = document.getElementById('image-upload')
      if (fileInput) {
        fileInput.value = ''
      }
    } else {
      setDescription('')
    }
    setLatexCode('')
    setError('')
    setCopied(false)
  }

  // Word to LaTeX handler
  const handleWordToLatex = async () => {
    if (!description.trim()) {
      setError('Please enter a description of the formula')
      return
    }

    if (description.trim().length < 3) {
      setError('Please provide a more detailed description (at least 3 characters)')
      return
    }

    setLoading(true)
    setError('')
    setCopied(false)

    try {
      const prompt = `Generate LaTeX code for the following economics/econometrics/mathematics formula description:

"${description.trim()}"

Requirements:
1. Return ONLY the LaTeX code, nothing else - no explanations, no markdown, no code blocks
2. Use proper LaTeX syntax for all mathematical symbols
3. For econometrics formulas, use standard notation:
   - Multiple regression: Y_i = \\beta_0 + \\beta_1 X_{1i} + \\beta_2 X_{2i} + ... + \\beta_k X_{ki} + \\varepsilon_i
   - R-squared: R^2 = 1 - \\frac{SSR}{SST} or R^2 = \\frac{SSE}{SST}
   - Gauss-Markov theorem: Show conditions (linearity, exogeneity, homoskedasticity, no autocorrelation)
   - LATE (Local Average Treatment Effect): Use the complete Wald estimator form: \\text{LATE} = \\frac{E[Y_i | Z_i = 1] - E[Y_i | Z_i = 0]}{E[D_i | Z_i = 1] - E[D_i | Z_i = 0]} = \\frac{\\text{ITT}}{\\text{Compliance Rate}} where Z_i is the instrument, D_i is treatment, Y_i is outcome, and the denominator is the first-stage effect. Alternatively, use the potential outcomes definition: E[Y_i(1) - Y_i(0) | D_i(1) > D_i(0)] where D_i(1) > D_i(0) identifies compliers. For "LATE formula", prefer the Wald estimator form as it is the most commonly used and estimable version.
   - IV: Use first-stage and second-stage equations
   - 2SLS: Show both stages clearly
   - Difference-in-differences: Y_{it} = \\alpha + \\beta Treatment_i + \\gamma Post_t + \\delta (Treatment_i \\times Post_t) + \\varepsilon_{it}
   - Regression discontinuity: Y_i = \\alpha + \\beta (X_i - c) + \\delta D_i + \\gamma (X_i - c) D_i + \\varepsilon_i
   - Fixed effects: Y_{it} = \\alpha_i + X_{it}'\\beta + \\varepsilon_{it}
   - Random effects: Y_{it} = \\alpha + X_{it}'\\beta + u_i + \\varepsilon_{it}
   - Logit: P(Y=1|X) = \\frac{\\exp(X'\\beta)}{1 + \\exp(X'\\beta)}
   - Probit: P(Y=1|X) = \\Phi(X'\\beta)
   - GMM: Use moment conditions
   - VAR: Show vector autoregression system
   - ARIMA: Show ARIMA(p,d,q) specification
4. For economics formulas, use standard notation:
   - Cobb-Douglas: Y = A K^α L^β or similar variations
   - Utility functions: U(x, y) = ...
   - Production functions: Q = f(K, L) = ...
   - Demand/supply curves: Q = a - bP or P = ...
   - Budget constraints: p_x x + p_y y = I
   - Cost functions: C(q) = ...
   - Profit functions: π = ...
5. Include proper subscripts, superscripts, and Greek letters
6. Use appropriate LaTeX environments if needed (equation, align, etc.)
7. Ensure the formula is mathematically correct and follows standard econometrics/economics notation

Examples:
- "Multiple regression model" → Y_i = \\beta_0 + \\beta_1 X_{1i} + \\beta_2 X_{2i} + \\varepsilon_i
- "R-squared formula" → R^2 = 1 - \\frac{\\sum (Y_i - \\hat{Y}_i)^2}{\\sum (Y_i - \\bar{Y})^2}
- "LATE formula" → \\text{LATE} = \\frac{E[Y_i | Z_i = 1] - E[Y_i | Z_i = 0]}{E[D_i | Z_i = 1] - E[D_i | Z_i = 0]} = \\frac{\\text{ITT}}{E[D_i | Z_i = 1] - E[D_i | Z_i = 0]} where ITT is the Intention-to-Treat effect
- "Cobb-Douglas production function" → Y = A K^{\\alpha} L^{1-\\alpha}
- "CES utility function" → U(x_1, x_2) = (\\alpha x_1^\\rho + (1-\\alpha) x_2^\\rho)^{1/\\rho}
- "Budget constraint" → p_1 x_1 + p_2 x_2 = I

Return the LaTeX code that can be directly used in a LaTeX document.`

      const systemMessage = `You are an expert in econometrics, economics, and mathematics notation. Your task is to convert natural language descriptions of econometric, economic, and mathematical formulas into accurate LaTeX code. You have deep knowledge of:
- Econometric methods (regression, IV, 2SLS, DID, RD, panel data, etc.)
- Econometric tests (Hausman, White, Breusch-Pagan, Durbin-Watson, etc.)
- Common economics formulas (Cobb-Douglas, CES, utility functions, production functions, etc.)
- Mathematical notation and LaTeX syntax
- Standard conventions in econometrics and economics literature

Always return clean, valid LaTeX code without any markdown formatting or explanations.`

      const response = await callChatGPT(prompt, systemMessage)
      
      let latex = response.content.trim()
      
      // Clean up the response
      latex = latex
        .replace(/^```latex\n?/i, '')
        .replace(/^```\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()
      
      // Remove dollar signs if they wrap the entire content
      if (latex.startsWith('$') && latex.endsWith('$') && latex.match(/\$/g)?.length === 2) {
        latex = latex.slice(1, -1).trim()
      }
      if (latex.startsWith('$$') && latex.endsWith('$$') && latex.match(/\$\$/g)?.length === 2) {
        latex = latex.slice(2, -2).trim()
      }
      
      // Remove common prefixes
      latex = latex
        .replace(/^latex[:\s]*/i, '')
        .replace(/^code[:\s]*/i, '')
        .replace(/^formula[:\s]*/i, '')
        .trim()

      if (latex.length > 0) {
        setLatexCode(latex)
        setError('')
      } else {
        setError('Failed to generate LaTeX code. Please try a different description.')
      }
    } catch (err) {
      console.error('Word to LaTeX error:', err)
      
      if (err.response) {
        const errorData = err.response.data
        setError(errorData.message || errorData.error || 'Failed to generate LaTeX code. Please try again.')
      } else if (err.request) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setLatexCode('')
    setError('')
    setCopied(false)
    // Clear picture-related states when switching to word tab
    if (tab === 'word') {
      setSelectedImage(null)
      setImagePreview(null)
      setImageSource(null)
    } else {
      setDescription('')
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Formula to LATEX</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('picture')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'picture'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📷 Picture to LaTeX
            </button>
            <button
              onClick={() => handleTabChange('word')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'word'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📝 Word to LaTeX
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📝 How to use:</h3>
          {activeTab === 'picture' ? (
            <>
              <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
                <li>Upload an image or <strong>paste a screenshot</strong> (Ctrl+V / Cmd+V) containing a mathematical formula</li>
                <li>Click "Convert to LATEX" to generate the code</li>
                <li>Copy the generated LATEX code to use in your documents</li>
              </ol>
              <p className="mt-2 text-blue-700 text-xs italic">💡 Tip: You can take a screenshot and paste it directly here!</p>
            </>
          ) : (
            <>
              <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
                <li>Enter a description of the formula (e.g., "Multiple regression model", "LATE formula", "Cobb-Douglas function")</li>
                <li>Click "Generate LaTeX" to create the LaTeX code</li>
                <li>Copy the generated LaTeX code to use in your documents</li>
              </ol>
              <p className="mt-2 text-blue-700 text-xs italic">💡 Examples: "Multiple regression", "R-squared formula", "LATE", "Gauss-Markov theorem", "Cobb-Douglas function", "Budget constraint"</p>
            </>
          )}
        </div>

        {/* Picture to LaTeX Section */}
        {activeTab === 'picture' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Upload Formula Image</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
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

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!selectedImage || loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Converting...' : 'Convert to LATEX'}
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

        {/* Word to LaTeX Section */}
        {activeTab === 'word' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Describe the Formula</h2>
            <div className="mb-4">
              <textarea
                value={description}
                onChange={(e) => {
                  const value = limitInputLength(e.target.value, 500)
                  setDescription(value)
                  if (error) setError('')
                }}
                placeholder="Examples: 'Multiple regression model', 'LATE formula', 'R-squared formula', 'Cobb-Douglas function', 'Budget constraint', 'Gauss-Markov theorem', etc."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                maxLength={500}
              />
              <p className="mt-1 text-sm text-gray-500">
                {description.length}/500 characters
              </p>
            </div>

            {/* Quick examples */}
            <div className="mb-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">📊 Econometrics:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Multiple regression model',
                    'R-squared formula',
                    'Gauss-Markov theorem',
                    'LATE formula',
                    'IV regression',
                    '2SLS',
                    'Difference-in-differences',
                    'Regression discontinuity',
                    'Fixed effects model',
                    'Random effects model',
                    'Logit model',
                    'Probit model',
                    'Heckman selection model',
                    'GMM estimator',
                    'VAR model',
                    'ARIMA model',
                    'Heteroskedasticity-robust standard errors',
                    'White test',
                    'Breusch-Pagan test',
                    'Hausman test',
                    'Wald test',
                    'Likelihood ratio test',
                    'F-test',
                    't-test',
                    'Durbin-Watson test'
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setDescription(example)
                        setError('')
                      }}
                      className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition border border-indigo-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">📈 Economics:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Cobb-Douglas function',
                    'CES utility',
                    'Budget constraint',
                    'Solow model',
                    'IS-LM model',
                    'Phillips curve',
                    'Okun\'s law',
                    'Taylor rule',
                    'Euler equation',
                    'Bellman equation',
                    'Hamiltonian',
                    'Lagrangian',
                    'Nash equilibrium',
                    'Pareto efficiency',
                    'Welfare function'
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setDescription(example)
                        setError('')
                      }}
                      className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition border border-green-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleWordToLatex}
                disabled={!description.trim() || loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate LaTeX'}
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

        {/* LATEX Code Result */}
        {latexCode && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Generated LATEX Code</h2>
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-800">
                {latexCode}
              </pre>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="mb-2">💡 Tip: Copy the code above and paste it into your LATEX document.</p>
              <p>For inline math, use: <code className="bg-gray-100 px-1 rounded">${latexCode}$</code></p>
              <p className="mt-1">For display math, use: <code className="bg-gray-100 px-1 rounded">\[{latexCode}\]</code></p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PicToLatex

