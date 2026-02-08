import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function LiteratureHelper() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfText, setPdfText] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [language, setLanguage] = useState('English')
  const [summaryStyle, setSummaryStyle] = useState('standard')

  const summaryStyles = [
    { id: 'standard', name: 'Standard Summary', description: 'Balanced overview of the paper' },
    { id: 'methodology', name: 'Methodology Focus', description: 'Emphasize research methods and data' },
    { id: 'findings', name: 'Findings Focus', description: 'Focus on key results and conclusions' },
    { id: 'citation', name: 'Citation Ready', description: 'Brief, ready to cite in your paper' },
  ]

  // Extract text from PDF using pdf.js
  const extractTextFromPDF = async (file) => {
    setExtracting(true)
    setError('')
    
    try {
      // Load PDF.js
      const pdfjs = await import('pdfjs-dist')
      
      // Set worker source from CDN
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'
      
      const arrayBuffer = await file.arrayBuffer()
      
      // Load the PDF document
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      const numPages = pdf.numPages
      
      // Extract text from each page (limit to first 30 pages for performance)
      const maxPages = Math.min(numPages, 30)
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n\n'
      }
      
      if (numPages > 30) {
        fullText += `\n[Note: Only first 30 of ${numPages} pages were extracted]`
      }
      
      if (!fullText.trim()) {
        throw new Error('No text content found in PDF')
      }
      
      setPdfText(fullText)
      setExtracting(false)
      return fullText
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError('Failed to extract text from PDF. The file may be scanned/image-based, or there was a loading error.')
      setExtracting(false)
      return null
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File size should be less than 20MB')
      return
    }

    setPdfFile(file)
    setError('')
    setResult(null)
    
    // Extract text from PDF
    await extractTextFromPDF(file)
  }

  const handleAnalyze = async () => {
    if (!pdfText) {
      setError('Please upload a PDF file first')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Truncate text if too long (keep first ~15000 chars for API limits)
      const truncatedText = pdfText.length > 15000 
        ? pdfText.substring(0, 15000) + '\n\n[Text truncated due to length...]'
        : pdfText

      let styleInstruction = ''
      switch (summaryStyle) {
        case 'methodology':
          styleInstruction = 'Focus especially on the research methodology, data sources, identification strategy, and empirical approach.'
          break
        case 'findings':
          styleInstruction = 'Focus especially on the main findings, results, and policy implications.'
          break
        case 'citation':
          styleInstruction = 'Provide a brief 2-3 sentence summary that can be directly used as a citation in a literature review.'
          break
        default:
          styleInstruction = 'Provide a balanced summary covering motivation, methodology, and findings.'
      }

      const prompt = `You are an expert academic researcher helping to write literature reviews for economics and policy papers.

Analyze the following academic paper and provide a summary that can be used in a literature review.

${styleInstruction}

Please respond in ${language} with the following JSON structure:
{
  "title": "Paper title (if identifiable)",
  "authors": "Author names (if identifiable)",
  "year": "Publication year (if identifiable)",
  "journal": "Journal name (if identifiable)",
  "summary": "A concise 3-5 sentence summary suitable for a literature review paragraph",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "methodology": "Brief description of the methodology used",
  "contribution": "Main contribution to the literature",
  "dataSource": "Data source used (if applicable)",
  "citationSuggestion": "A ready-to-use sentence for citing this paper in your literature review"
}

Here is the paper text:

${truncatedText}`

      const response = await callChatGPT(prompt)
      
      // Parse the response
      const content = response.choices[0].message.content
      
      // Try to extract JSON from the response
      let parsed
      try {
        // Find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch (parseErr) {
        // If JSON parsing fails, create a simple result from the text
        parsed = {
          summary: content,
          keyFindings: [],
          citationSuggestion: ''
        }
      }

      setResult(parsed)
    } catch (err) {
      console.error('Analysis error:', err)
      if (err.message?.includes('API key')) {
        setError('API key not configured. Please check your settings.')
      } else {
        setError('Failed to analyze the paper. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setPdfFile(null)
    setPdfText('')
    setResult(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleCopyAll = () => {
    if (!result) return
    
    let fullText = ''
    if (result.title) fullText += `Title: ${result.title}\n`
    if (result.authors) fullText += `Authors: ${result.authors}\n`
    if (result.year) fullText += `Year: ${result.year}\n`
    if (result.journal) fullText += `Journal: ${result.journal}\n`
    fullText += `\nSummary:\n${result.summary}\n`
    if (result.keyFindings?.length > 0) {
      fullText += `\nKey Findings:\n${result.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n`
    }
    if (result.methodology) fullText += `\nMethodology: ${result.methodology}\n`
    if (result.contribution) fullText += `\nContribution: ${result.contribution}\n`
    if (result.citationSuggestion) fullText += `\nCitation Suggestion: ${result.citationSuggestion}\n`
    
    navigator.clipboard.writeText(fullText)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← Back
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Literature Review Helper</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">📚 Summarize Papers for Literature Review</h2>
          <p className="opacity-90">
            Upload a PDF paper and get a concise summary with key findings, methodology, and a ready-to-cite sentence for your literature review.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="space-y-6">
            {/* PDF Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📄 Upload Paper</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <div className="text-5xl mb-4">📄</div>
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
                >
                  Choose PDF File
                </label>
                <p className="mt-3 text-sm text-gray-500">Maximum file size: 20MB</p>
              </div>

              {pdfFile && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium text-gray-800">{pdfFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {extracting && (
                      <span className="text-amber-600 text-sm">Extracting text...</span>
                    )}
                    {pdfText && !extracting && (
                      <span className="text-green-600 text-sm">✓ Ready</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ Settings</h3>
              

              {/* Summary Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {summaryStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSummaryStyle(style.id)}
                      className={`p-3 rounded-lg text-left border-2 transition ${
                        summaryStyle === style.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{style.name}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>
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
                  disabled={loading || !pdfText || extracting}
                  className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    '📖 Generate Summary'
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
                {/* Paper Info */}
                {(result.title || result.authors || result.year) && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Paper Information</h3>
                    <div className="space-y-2">
                      {result.title && (
                        <p><span className="font-medium">Title:</span> {result.title}</p>
                      )}
                      {result.authors && (
                        <p><span className="font-medium">Authors:</span> {result.authors}</p>
                      )}
                      {result.year && (
                        <p><span className="font-medium">Year:</span> {result.year}</p>
                      )}
                      {result.journal && (
                        <p><span className="font-medium">Journal:</span> {result.journal}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-800">📝 Summary</h3>
                    <button
                      onClick={() => handleCopy(result.summary)}
                      className="text-sm text-amber-600 hover:text-amber-700"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">{result.summary}</p>
                  </div>
                </div>

                {/* Key Findings */}
                {result.keyFindings?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Key Findings</h3>
                    <ul className="space-y-2">
                      {result.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">{idx + 1}.</span>
                          <span className="text-gray-700">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Methodology & Contribution */}
                {(result.methodology || result.contribution || result.dataSource) && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🔬 Details</h3>
                    <div className="space-y-3">
                      {result.methodology && (
                        <div>
                          <span className="font-medium text-gray-700">Methodology: </span>
                          <span className="text-gray-600">{result.methodology}</span>
                        </div>
                      )}
                      {result.dataSource && (
                        <div>
                          <span className="font-medium text-gray-700">Data Source: </span>
                          <span className="text-gray-600">{result.dataSource}</span>
                        </div>
                      )}
                      {result.contribution && (
                        <div>
                          <span className="font-medium text-gray-700">Contribution: </span>
                          <span className="text-gray-600">{result.contribution}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Citation Suggestion */}
                {result.citationSuggestion && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-bold text-gray-800">✍️ Citation Suggestion</h3>
                      <button
                        onClick={() => handleCopy(result.citationSuggestion)}
                        className="text-sm text-amber-600 hover:text-amber-700"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-amber-500">
                      <p className="text-gray-700 italic">{result.citationSuggestion}</p>
                    </div>
                  </div>
                )}

                {/* Copy All Button */}
                <button
                  onClick={handleCopyAll}
                  className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
                >
                  📋 Copy All to Clipboard
                </button>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Summary Will Appear Here
                </h3>
                <p className="text-gray-500">
                  Upload a PDF paper and click "Generate Summary" to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LiteratureHelper
