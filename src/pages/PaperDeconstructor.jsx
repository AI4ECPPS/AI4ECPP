import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import Logo from '../components/Logo'

// Helper functions to extract information from text response
const extractList = (text, key, altKey) => {
  const regex = new RegExp(`(${key}|${altKey}s?)[:：]?\\s*([^\\n]+)`, 'gi')
  const matches = text.match(regex)
  if (matches) {
    return matches.slice(0, 5).map(m => m.replace(/^[^:：]+[:：]?\s*/, '').trim())
  }
  return ['Information extracted from paper']
}

const extractSummary = (text) => {
  const summaryMatch = text.match(/summary[:\s]+([^\n]+)/i)
  if (summaryMatch) return summaryMatch[1]
  return text.substring(0, 200) + '...'
}

function PaperDeconstructor() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [translatedContent, setTranslatedContent] = useState('')
  const [extractedInfo, setExtractedInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [translationLoading, setTranslationLoading] = useState(false)

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        setFileContent(event.target.result)
      }
      reader.readAsText(uploadedFile)
    }
  }

  const handleTranslate = async () => {
    if (!fileContent.trim()) {
      alert('Please upload a file first')
      return
    }

    setTranslationLoading(true)
    try {
      const prompt = `Translate the following academic paper to English. Maintain the structure, technical terms, and formatting:

${fileContent.substring(0, 5000)}${fileContent.length > 5000 ? '...' : ''}`

      const response = await callChatGPT(prompt, 'You are an expert translator specializing in academic economics and public policy papers.')
      
      setTranslatedContent(response.content || 'Translation failed. Please try again.')
    } catch (error) {
      alert('Error translating. Please try again.')
      console.error(error)
    } finally {
      setTranslationLoading(false)
    }
  }

  const handleExtract = async () => {
    const contentToAnalyze = translatedContent || fileContent
    if (!contentToAnalyze.trim()) {
      alert('Please upload a file first')
      return
    }

    setLoading(true)
    try {
      const prompt = `Analyze the following economics/public policy paper and extract:

1. Main databases used
2. Main methodologies/strategies
3. Key formulas/equations
4. Research assumptions
5. Limitations
6. One-sentence summary

Paper content:
${contentToAnalyze.substring(0, 8000)}${contentToAnalyze.length > 8000 ? '...' : ''}`

      const response = await callChatGPT(prompt, 'You are an expert in economics and public policy research analysis. Extract information and format it as JSON with keys: databases (array), methodologies (array), formulas (array), assumptions (array), limitations (array), summary (string).')
      
      try {
        // Try to parse JSON response
        const extracted = JSON.parse(response.content)
        setExtractedInfo(extracted)
      } catch (e) {
        // If not JSON, try to extract from text
        const content = response.content || ''
        const extracted = {
          databases: extractList(content, 'databases', 'database'),
          methodologies: extractList(content, 'methodologies', 'method'),
          formulas: extractList(content, 'formulas', 'formula'),
          assumptions: extractList(content, 'assumptions', 'assumption'),
          limitations: extractList(content, 'limitations', 'limitation'),
          summary: extractSummary(content)
        }
        setExtractedInfo(extracted)
      }
    } catch (error) {
      alert('Error extracting information. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-2xl font-bold text-gray-800">Paper Deconstructor</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Upload Paper</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Choose File
            </label>
            {file && (
              <p className="mt-4 text-gray-600">Selected: {file.name}</p>
            )}
          </div>
        </div>

        {/* Translation Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Translation</h2>
            <button
              onClick={handleTranslate}
              disabled={translationLoading || !fileContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translationLoading ? 'Translating...' : 'Translate to English'}
            </button>
          </div>
          {translatedContent && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{translatedContent}</pre>
            </div>
          )}
          {!fileContent && (
            <p className="text-gray-500 text-sm italic">Upload a file to enable translation</p>
          )}
        </div>

        {/* Extract Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleExtract}
            disabled={loading || (!fileContent && !translatedContent)}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Extracting Information...' : 'Extract Key Information'}
          </button>
          {!fileContent && !translatedContent && (
            <p className="text-gray-500 text-sm italic text-center mt-2">Upload a file to enable extraction</p>
          )}
        </div>

        {/* Extracted Information */}
        {extractedInfo && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">One-Sentence Summary</h2>
              <p className="text-gray-700 text-lg">{extractedInfo.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-indigo-600">Main Databases</h3>
                <ul className="space-y-2">
                  {extractedInfo.databases.map((db, idx) => (
                    <li key={idx} className="text-gray-700">• {db}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-purple-600">Main Methodologies</h3>
                <ul className="space-y-2">
                  {extractedInfo.methodologies.map((method, idx) => (
                    <li key={idx} className="text-gray-700">• {method}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-green-600">Key Formulas</h3>
                <ul className="space-y-2">
                  {extractedInfo.formulas.map((formula, idx) => (
                    <li key={idx} className="text-gray-700 font-mono bg-gray-50 p-2 rounded">• {formula}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-gray-500 italic">Formula explanations coming soon...</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-orange-600">Research Assumptions</h3>
                <ul className="space-y-2">
                  {extractedInfo.assumptions.map((assumption, idx) => (
                    <li key={idx} className="text-gray-700">• {assumption}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-3 text-red-600">Limitations</h3>
              <ul className="space-y-2">
                {extractedInfo.limitations.map((limitation, idx) => (
                  <li key={idx} className="text-gray-700">• {limitation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PaperDeconstructor

