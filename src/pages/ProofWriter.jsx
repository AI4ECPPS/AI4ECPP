import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import api from '../utils/api'
import Logo from '../components/Logo'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

// Safe wrapper for BlockMath with error handling
function SafeBlockMath({ math }) {
  try {
    return <BlockMath math={math} />
  } catch (e) {
    return (
      <div className="text-red-600 font-mono text-sm">
        LaTeX Error: {math}
      </div>
    )
  }
}

// Safe wrapper for InlineMath with error handling
function SafeInlineMath({ math }) {
  try {
    return (
      <span style={{ display: 'inline' }}>
        <InlineMath math={math} />
      </span>
    )
  } catch (e) {
    return (
      <span className="text-red-600 font-mono text-xs">
        [LaTeX Error: {math}]
      </span>
    )
  }
}

// Component to render proof text with LaTeX expressions
function RenderedProof({ text }) {
  // Split text by LaTeX expressions
  // Support multiple formats: $$...$$, $...$, \[...\], \(...\)
  const parts = []
  let lastIndex = 0
  
  // Match LaTeX in order: block math first, then inline
  // Support multiple formats: $$...$$, \[...\], $...$, \(...\)
  // Use separate regexes to avoid conflicts and ensure correct matching
  
  // First, find all LaTeX expressions with their positions
  const latexMatches = []
  
  // Match block math: $$...$$ (must be done first to avoid conflicts with $)
  const blockMathRegex1 = /\$\$([^$]+)\$\$/g
  let match
  while ((match = blockMathRegex1.exec(text)) !== null) {
    latexMatches.push({
      index: match.index,
      end: match.index + match[0].length,
      type: 'block',
      content: match[1].trim()
    })
  }
  
  // Match block math: \[...\]
  const blockMathRegex2 = /\\\[([^\]]+)\\\]/g
  while ((match = blockMathRegex2.exec(text)) !== null) {
    latexMatches.push({
      index: match.index,
      end: match.index + match[0].length,
      type: 'block',
      content: match[1].trim()
    })
  }
  
  // Match inline math: $...$ (avoid matching $$ by checking context)
  const inlineMathRegex1 = /\$([^$\n]+?)\$/g
  while ((match = inlineMathRegex1.exec(text)) !== null) {
    // Check if it's not part of $$
    const before = text[match.index - 1]
    const after = text[match.index + match[0].length]
    if (before !== '$' && after !== '$') {
      latexMatches.push({
        index: match.index,
        end: match.index + match[0].length,
        type: 'inline',
        content: match[1].trim()
      })
    }
  }
  
  // Match inline math: \(...\)
  const inlineMathRegex2 = /\\\(([^)]+)\\\)/g
  while ((match = inlineMathRegex2.exec(text)) !== null) {
    latexMatches.push({
      index: match.index,
      end: match.index + match[0].length,
      type: 'inline',
      content: match[1].trim()
    })
  }
  
  // Sort matches by index
  latexMatches.sort((a, b) => a.index - b.index)
  
  // Remove overlapping matches (keep the first one)
  const filteredMatches = []
  let lastEnd = 0
  for (const latexMatch of latexMatches) {
    if (latexMatch.index >= lastEnd) {
      filteredMatches.push(latexMatch)
      lastEnd = latexMatch.end
    }
  }
  
  // Build parts array
  for (const latexMatch of filteredMatches) {
    // Add text before the match
    if (latexMatch.index > lastIndex) {
      const textPart = text.substring(lastIndex, latexMatch.index)
      if (textPart) {
        parts.push({ type: 'text', content: textPart })
      }
    }
    
    // Add the LaTeX expression
    parts.push({ type: latexMatch.type, content: latexMatch.content })
    
    lastIndex = latexMatch.end
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const textPart = text.substring(lastIndex)
    if (textPart) {
      parts.push({ type: 'text', content: textPart })
    }
  }
  
  // If no LaTeX found, just return the text with preserved line breaks
  if (parts.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
        {text}
      </div>
    )
  }
  
  // Group consecutive text and inline math into paragraphs, separate block math
  const groupedParts = []
  let currentGroup = []
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    
    if (part.type === 'block') {
      // Block math: save current group and start new
      if (currentGroup.length > 0) {
        groupedParts.push({ type: 'mixed', content: [...currentGroup] })
        currentGroup = []
      }
      groupedParts.push({ type: 'block', content: part.content })
    } else {
      // Text or inline: add to current group
      currentGroup.push(part)
    }
  }
  
  // Add remaining group
  if (currentGroup.length > 0) {
    groupedParts.push({ type: 'mixed', content: currentGroup })
  }
  
  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      {groupedParts.map((group, groupIndex) => {
        if (group.type === 'block') {
          return (
            <div key={groupIndex} className="my-4 flex justify-center">
              <SafeBlockMath math={group.content} />
            </div>
          )
        } else if (group.type === 'mixed') {
          // Render mixed content (text + inline math) as paragraphs
          // Combine all parts into a single string with markers
          let fullText = ''
          const mathMarkers = []
          
          group.content.forEach((part, idx) => {
            if (part.type === 'text') {
              fullText += part.content
            } else if (part.type === 'inline') {
              const marker = `__MATH_${idx}__`
              mathMarkers.push({ marker, content: part.content })
              fullText += marker
            }
          })
          
          // Split by double newlines for paragraphs
          const paragraphs = fullText.split(/\n\n+/)
          
          return (
            <div key={groupIndex}>
              {paragraphs.map((para, paraIndex) => {
                if (!para.trim()) return null
                
                // Check if it's a heading
                if (para.match(/^###? ?/)) {
                  const level = para.match(/^###/)?.[0]?.length || 2
                  const content = para.replace(/^###? ?/, '')
                  const HeadingTag = level === 3 ? 'h3' : 'h2'
                  return (
                    <HeadingTag key={paraIndex} className={`${level === 3 ? 'text-lg' : 'text-xl'} font-bold mt-4 mb-2`}>
                      {renderTextWithMath(content, mathMarkers)}
                    </HeadingTag>
                  )
                }
                
                // Check if it's a list
                if (para.match(/^[\*\-] /)) {
                  const items = para.split(/\n(?=[\*\-] )/).filter(item => item.trim())
                  return (
                    <ul key={paraIndex} className="list-disc ml-6 mb-2 space-y-1">
                      {items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          {renderTextWithMath(item.replace(/^[\*\-] /, ''), mathMarkers)}
                        </li>
                      ))}
                    </ul>
                  )
                }
                
                // Regular paragraph - render inline with text
                return (
                  <p key={paraIndex} className="mb-2">
                    {renderTextWithMath(para, mathMarkers)}
                  </p>
                )
              })}
            </div>
          )
        }
        return null
      })}
    </div>
  )
  
  // Helper to render text with inline math markers replaced
  function renderTextWithMath(text, mathMarkers) {
    const result = []
    let lastIndex = 0
    
    // Find all marker positions
    const positions = []
    for (const mathMarker of mathMarkers) {
      let searchIndex = 0
      while (true) {
        const pos = text.indexOf(mathMarker.marker, searchIndex)
        if (pos === -1) break
        positions.push({
          index: pos,
          end: pos + mathMarker.marker.length,
          content: mathMarker.content
        })
        searchIndex = pos + 1
      }
    }
    
    // Sort by position
    positions.sort((a, b) => a.index - b.index)
    
    // Build result
    for (const pos of positions) {
      // Add text before
      if (pos.index > lastIndex) {
        const textBefore = text.substring(lastIndex, pos.index)
        const lines = textBefore.split('\n')
        lines.forEach((line, lineIdx) => {
          if (lineIdx > 0) result.push(<br key={`br-${lastIndex}-${lineIdx}`} />)
          if (line) result.push(<span key={`text-${lastIndex}-${lineIdx}`}>{line}</span>)
        })
      }
      
      // Add inline math - ensure it's inline (no block styling)
      result.push(
        <SafeInlineMath key={`math-${pos.index}`} math={pos.content} />
      )
      
      lastIndex = pos.end
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex)
      const lines = remaining.split('\n')
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) result.push(<br key={`br-end-${lineIdx}`} />)
        if (line) result.push(<span key={`text-end-${lineIdx}`}>{line}</span>)
      })
    }
    
    return result.length > 0 ? result : <span>{text}</span>
  }
}

function ProofWriter() {
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageSource, setImageSource] = useState(null) // 'upload' or 'paste'
  const [latexFormula, setLatexFormula] = useState('')
  const [proof, setProof] = useState('')
  const [loading, setLoading] = useState(false)
  const [proofLoading, setProofLoading] = useState(false)
  const [error, setError] = useState('')
  const [formulaViewMode, setFormulaViewMode] = useState('rendered') // 'latex' or 'rendered'
  const [proofViewMode, setProofViewMode] = useState('rendered') // 'latex' or 'rendered'
  const containerRef = useRef(null)

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
    setLatexFormula('')
    setProof('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          setError('Image is too small. Please use a higher resolution image for better accuracy.')
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
    if (container) {
      container.addEventListener('paste', handlePaste)
      window.addEventListener('paste', handlePaste)
      
      return () => {
        container.removeEventListener('paste', handlePaste)
        window.removeEventListener('paste', handlePaste)
      }
    }
  }, [handlePaste])

  // Recognize formula from image
  const handleRecognizeFormula = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError('')
    setLatexFormula('')
    setProof('')

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64Image = event.target.result.split(',')[1]

          if (!base64Image || base64Image.length === 0) {
            setError('Failed to process image. Please try again.')
            setLoading(false)
            return
          }

          // Call pic-to-latex API to recognize the formula
          const response = await api.post('/pic-to-latex', {
            image: base64Image,
            imageType: selectedImage.type
          })

          if (response.data.latex) {
            const latex = response.data.latex.trim()
            if (latex.length > 0) {
              setLatexFormula(latex)
              setError('')
            } else {
              setError('Failed to recognize formula from image. Please try again with a clearer image.')
            }
          } else {
            setError('Failed to recognize formula. The server did not return valid LaTeX.')
          }
        } catch (err) {
          console.error('Error recognizing formula:', err)
          
          if (err.response) {
            const errorData = err.response.data
            setError(errorData.message || errorData.error || 'Failed to recognize formula. Please try again.')
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

  // Generate proof
  const handleGenerateProof = async () => {
    if (!latexFormula) {
      setError('Please recognize the formula first')
      return
    }

    setProofLoading(true)
    setError('')
    setProof('')

    try {
      const prompt = `Analyze the following mathematical formula and provide a proof or explanation:

${latexFormula}

Requirements:
1. If this formula can be proven, provide a complete, rigorous mathematical proof with:
   - Clear statement of what is being proven
   - Step-by-step logical reasoning
   - Proper mathematical notation using LaTeX
   - Clear conclusion
   - Format the proof professionally with proper structure

2. If this formula cannot be proven (e.g., it's a definition, an empirical relationship, a conjecture, or requires assumptions that cannot be verified), respond with:
   "I cannot provide a proof for this formula at this time. This may be because:
   - It is a definition rather than a theorem
   - It requires empirical verification
   - It is a conjecture that has not been proven
   - Additional context or assumptions are needed"

3. Use proper LaTeX formatting for all mathematical expressions
4. Be rigorous and mathematically sound
5. If providing a proof, make it clear, well-structured, and easy to follow

Return the proof or explanation in English, formatted with proper LaTeX for mathematical expressions.`

      const systemMessage = `You are an expert mathematician and mathematical logician. Your task is to analyze mathematical formulas and provide rigorous proofs when possible. You have deep knowledge of:
- Mathematical analysis, algebra, calculus, and advanced mathematics
- Proof techniques (direct proof, proof by contradiction, induction, etc.)
- Mathematical logic and rigor
- When a statement can be proven vs. when it requires empirical verification or additional assumptions

Always be honest about whether a proof is possible. If a formula cannot be proven with the given information, clearly state why.`

      const response = await callChatGPT(prompt, systemMessage)
      
      const proofText = response.content || ''
      
      if (proofText.trim().length > 0) {
        setProof(proofText.trim())
        setError('')
      } else {
        setError('Failed to generate proof. Please try again.')
      }
    } catch (err) {
      console.error('Error generating proof:', err)
      
      if (err.response) {
        const errorData = err.response.data
        setError(errorData.message || errorData.error || 'Failed to generate proof. Please try again.')
      } else if (err.request) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setProofLoading(false)
    }
  }

  const handleClear = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setImageSource(null)
    setLatexFormula('')
    setProof('')
    setError('')
    const fileInput = document.getElementById('formula-image-upload')
    if (fileInput) {
      fileInput.value = ''
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
            <h1 className="text-2xl font-bold text-gray-800">Proof Writer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📝 How to use:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
            <li>Upload or paste a screenshot of a mathematical formula</li>
            <li>Click "Recognize Formula" to identify the formula</li>
            <li>Click "Explain Formula" to generate a proof or explanation</li>
            <li>If the formula can be proven, you'll get a complete mathematical proof</li>
          </ol>
        </div>

        {/* Image Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Upload Formula Image</h2>
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRecognizeFormula}
              disabled={!selectedImage || loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recognizing...' : 'Recognize Formula'}
            </button>
            {selectedImage && (
              <button
                onClick={handleClear}
                disabled={loading || proofLoading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Recognized Formula */}
        {latexFormula && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recognized Formula</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormulaViewMode('rendered')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    formulaViewMode === 'rendered'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Rendered
                </button>
                <button
                  onClick={() => setFormulaViewMode('latex')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    formulaViewMode === 'latex'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  LaTeX
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              {formulaViewMode === 'rendered' ? (
                <div className="flex items-center justify-center min-h-[60px]">
                  <SafeBlockMath math={latexFormula} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-800">
                  {latexFormula}
                </pre>
              )}
            </div>
            
            <button
              onClick={handleGenerateProof}
              disabled={proofLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {proofLoading ? 'Generating Proof...' : 'Explain Formula'}
            </button>
          </div>
        )}

        {/* Generated Proof */}
        {proof && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Mathematical Proof / Explanation</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setProofViewMode('rendered')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    proofViewMode === 'rendered'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Rendered
                </button>
                <button
                  onClick={() => setProofViewMode('latex')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    proofViewMode === 'latex'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  LaTeX
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              {proofViewMode === 'rendered' ? (
                <div className="prose max-w-none">
                  <RenderedProof text={proof} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-mono">
                  {proof}
                </pre>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProofWriter

