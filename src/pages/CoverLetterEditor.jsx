import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { callChatGPT } from '../utils/api'

function CoverLetterEditor() {
  const navigate = useNavigate()
  
  // Input states
  const [coverLetter, setCoverLetter] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [showResumeInput, setShowResumeInput] = useState(false)
  
  // Output states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revisedLetter, setRevisedLetter] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [highlightedContent, setHighlightedContent] = useState('')

  const handleAnalyze = async () => {
    if (!coverLetter.trim()) {
      setError('Please enter your cover letter')
      return
    }
    
    if (!jobDescription.trim()) {
      setError('Please enter the job description')
      return
    }

    setLoading(true)
    setError('')
    setRevisedLetter('')
    setSuggestions([])
    setHighlightedContent('')

    try {
      const prompt = `You are an expert career coach and cover letter editor. Analyze the following cover letter for a job application and provide specific, actionable revision suggestions.

## Original Cover Letter:
${coverLetter}

## Job Description:
${jobDescription}

${resume ? `## Candidate's Resume (for context):
${resume}` : ''}

## Your Task:
1. Analyze how well the cover letter matches the job requirements
2. Identify specific areas that need improvement
3. Provide a REVISED version of the cover letter that:
   - Better highlights relevant skills and experiences
   - Uses keywords from the job description
   - Is more compelling and professional
   - Maintains the candidate's authentic voice
   - Is appropriately concise

## Response Format:
Please respond in the following JSON format:
{
  "suggestions": [
    {
      "category": "Category name (e.g., 'Opening', 'Skills Match', 'Achievements', 'Closing', 'Tone', 'Keywords')",
      "issue": "What's the problem",
      "recommendation": "What to do instead"
    }
  ],
  "revisedLetter": "The complete revised cover letter with improvements",
  "changes": [
    {
      "original": "original text that was changed",
      "revised": "new improved text"
    }
  ]
}

Important: 
- Make sure the JSON is valid
- The revisedLetter should be a complete, ready-to-use cover letter
- Include 3-6 specific suggestions
- Identify 3-8 specific text changes`

      const systemMessage = `You are an expert career counselor and professional cover letter editor with years of experience helping candidates land their dream jobs. You understand what hiring managers look for and how to make cover letters stand out. Always respond with valid JSON.`

      const response = await callChatGPT(prompt, systemMessage)
      
      // Parse the response
      let content = response.content || ''
      
      // Try to extract JSON from the response
      let parsed = null
      
      // First try to parse as-is
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1].trim())
          } catch {
            // Continue to next attempt
          }
        }
        
        // Try to find JSON object in the response
        if (!parsed) {
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
              parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1))
            } catch {
              // Give up on JSON parsing
            }
          }
        }
      }

      if (parsed) {
        setSuggestions(parsed.suggestions || [])
        setRevisedLetter(parsed.revisedLetter || '')
        
        // Create highlighted version
        if (parsed.changes && parsed.changes.length > 0 && parsed.revisedLetter) {
          let highlighted = parsed.revisedLetter
          
          // Mark each changed section with special markers
          parsed.changes.forEach((change, index) => {
            if (change.revised && highlighted.includes(change.revised)) {
              // Wrap the revised text with markers for highlighting
              highlighted = highlighted.replace(
                change.revised,
                `<mark class="bg-yellow-200 px-0.5 rounded" title="Changed from: ${change.original?.substring(0, 50)}...">${change.revised}</mark>`
              )
            }
          })
          
          setHighlightedContent(highlighted)
        } else {
          setHighlightedContent(parsed.revisedLetter || '')
        }
      } else {
        // Fallback: show the raw response
        setRevisedLetter(content)
        setHighlightedContent(content)
        setSuggestions([{
          category: 'Note',
          issue: 'Could not parse structured response',
          recommendation: 'Please review the suggestions above'
        }])
      }

    } catch (err) {
      console.error('Error analyzing cover letter:', err)
      setError('Failed to analyze cover letter. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setCoverLetter('')
    setJobDescription('')
    setResume('')
    setRevisedLetter('')
    setSuggestions([])
    setHighlightedContent('')
    setError('')
  }

  const handleCopyRevised = () => {
    navigator.clipboard.writeText(revisedLetter)
      .then(() => {
        alert('Revised cover letter copied to clipboard!')
      })
      .catch(() => {
        alert('Failed to copy. Please select and copy manually.')
      })
  }

  const handleDownload = () => {
    const blob = new Blob([revisedLetter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'revised_cover_letter.txt'
    a.click()
    URL.revokeObjectURL(url)
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
            <h1 className="text-2xl font-bold text-gray-800">Cover Letter Editor</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="rounded-xl p-6 text-white mb-8" style={{ backgroundColor: '#5B5BF5' }}>
          <h2 className="text-2xl font-bold mb-2">AI-Powered Cover Letter Revision</h2>
          <p className="text-indigo-100">
            Upload your cover letter and job description to get personalized suggestions. 
            Changes will be highlighted in yellow for easy review.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Cover Letter Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">✉️ Your Cover Letter</h3>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Paste your cover letter here..."
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              />
              <p className="mt-2 text-sm text-gray-500">
                {coverLetter.length} characters
              </p>
            </div>

            {/* Job Description Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Job Description</h3>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              />
              <p className="mt-2 text-sm text-gray-500">
                {jobDescription.length} characters
              </p>
            </div>

            {/* Optional Resume Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">📄 Your Resume (Optional)</h3>
                <button
                  onClick={() => setShowResumeInput(!showResumeInput)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showResumeInput ? 'Hide' : 'Add Resume for Better Results'}
                </button>
              </div>
              
              {showResumeInput && (
                <>
                  <textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="Paste your resume text here for more personalized suggestions..."
                    className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Adding your resume helps the AI understand your background better
                  </p>
                </>
              )}
              
              {!showResumeInput && (
                <p className="text-sm text-gray-500">
                  Providing your resume helps tailor suggestions to your specific experience
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading || !coverLetter.trim() || !jobDescription.trim()}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  '✨ Get Revision Suggestions'
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Improvement Suggestions</h3>
                <div className="space-y-4">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border-l-4 border-indigo-400 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {suggestion.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{suggestion.issue}</p>
                      <p className="text-sm text-gray-600 mt-1">→ {suggestion.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revised Letter with Highlights */}
            {highlightedContent && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">📝 Revised Cover Letter</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyRevised}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      ⬇️ Download
                    </button>
                  </div>
                </div>
                
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-block w-4 h-4 bg-yellow-200 rounded"></span>
                  <span>Highlighted sections indicate changes from your original</span>
                </div>
                
                <div 
                  className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightedContent }}
                />
              </div>
            )}

            {/* Original vs Revised Comparison (if no results yet) */}
            {!highlightedContent && !loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">✉️</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Revised Letter Will Appear Here</h3>
                <p className="text-gray-500">
                  Enter your cover letter and job description, then click "Get Revision Suggestions" to see AI-powered improvements.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CoverLetterEditor
