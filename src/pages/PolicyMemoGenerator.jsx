import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { callChatGPT, callChatGPTStream } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength, containsProfanity } from '../utils/security'

function PolicyMemoGenerator() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('generate')
  const [question, setQuestion] = useState('')
  const [wordCount, setWordCount] = useState('')
  const [existingMemo, setExistingMemo] = useState('')
  const [generatedMemo, setGeneratedMemo] = useState('')
  const [editedMemo, setEditedMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [questionError, setQuestionError] = useState('')
  const [useRag, setUseRag] = useState(false)
  const [ragAvailable, setRagAvailable] = useState(false)
  const [error, setError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    api.get('/rag/health').then(r => setRagAvailable(r.data.status === 'ok')).catch(() => setRagAvailable(false))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const getGeneratedDownloadFilename = () => {
    const d = new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const slug = question.trim().slice(0, 40).replace(/\s+/g, '-').replace(/[^\w\-]/g, '') || 'memo'
    return `policy-memo-${slug}-${dateStr}.md`
  }

  const getEditedDownloadFilename = () => {
    const d = new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return `edited-memo-${dateStr}.md`
  }

  const handleCopy = (content, label) => {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopyFeedback(label)
      setTimeout(() => setCopyFeedback(''), 2000)
    }).catch(() => setError('Copy failed.'))
  }

  const handleQuestionChange = (e) => {
    const value = limitInputLength(e.target.value, 2000)
    setQuestion(value)
    
    // 实时验证脏话
    if (value && containsProfanity(value)) {
      setQuestionError('⚠️ Please use appropriate language')
    } else {
      setQuestionError('')
    }
  }

  const handleWordCountChange = (e) => {
    const value = limitInputLength(e.target.value, 10)
    // 只允许数字
    if (value === '' || /^\d+$/.test(value)) {
      setWordCount(value)
    }
  }

  const handleChatInputChange = (e) => {
    const value = limitInputLength(e.target.value, 1000)
    setChatInput(value)
  }

  const handleExistingMemoChange = (e) => {
    const value = limitInputLength(e.target.value, 50000)
    setExistingMemo(value)
  }

  const handleGenerate = async () => {
    setError('')
    const validation = validateAndSanitizeText(question, {
      maxLength: 2000,
      minLength: 10,
      required: true,
      filterProfanity: false
    })

    if (!validation.valid) {
      setError(validation.message || 'Please check your input')
      return
    }

    if (!question.trim()) {
      setError('Please enter a research question (at least 10 characters).')
      return
    }

    const cleanedQuestion = validation.cleaned
    setLoading(true)
    setGeneratedMemo('')

    try {
      let contextFromRag = ''
      if (useRag && ragAvailable) {
        try {
          const ragRes = await api.post('/rag/retrieve', { question: cleanedQuestion, topK: 5 })
          if (ragRes.data.context && ragRes.data.context.trim()) {
            contextFromRag = ragRes.data.context.trim()
          }
        } catch (_) {
          // proceed without RAG context
        }
      }
      const ragBlock = contextFromRag
        ? `Use the following excerpts from the user's uploaded documents as supporting evidence and context. Base your memo on this material where relevant; do not invent facts.\n\n---\n${contextFromRag}\n---\n\n`
        : ''
      const prompt = `${ragBlock}Generate a structured policy memo for the following research question: "${cleanedQuestion}"${wordCount ? ` The memo should be approximately ${wordCount} words.` : ''}

Please structure the memo with:
1. Executive Summary
2. Problem Statement
3. Key Points
4. Analysis
5. Actionable Recommendations
6. Conclusion

Make it professional, well-structured, and suitable for policy decision-making.`

      const systemMessage = contextFromRag
        ? 'You are an expert policy analyst. Use the provided document excerpts to ground your memo; cite or refer to them where relevant. Do not make up facts.'
        : 'You are an expert policy analyst specializing in economics and public policy.'

      try {
        const result = await callChatGPTStream(prompt, systemMessage, (chunk) => {
          setGeneratedMemo((prev) => prev + chunk)
        })
        const content = (result?.content || '').trim()
        if (content) {
          setGeneratedMemo(content)
          setChatHistory([{ role: 'user', content: question }, { role: 'assistant', content }])
        } else {
          setError('Generation returned no content. Please try again.')
        }
      } catch (streamErr) {
        const msg = streamErr?.message || ''
        if (msg.includes('404')) {
          const response = await callChatGPT(prompt, systemMessage)
          const memoContent = response?.content || 'Failed to generate memo. Please try again.'
          setGeneratedMemo(memoContent)
          setChatHistory([{ role: 'user', content: question }, { role: 'assistant', content: memoContent }])
        } else {
          throw streamErr
        }
      }
    } catch (err) {
      console.error(err)
      const msg = err?.message || ''
      setError(msg.includes('Network') || err?.request ? 'Network error. Please try again.' : (msg || 'Error generating memo. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    setError('')
    if (!existingMemo.trim()) {
      setError('Please enter your existing memo.')
      return
    }

    setLoading(true)
    setEditedMemo('')

    try {
      let contextFromRag = ''
      if (useRag && ragAvailable) {
        try {
          const query = existingMemo.trim().slice(0, 500)
          const ragRes = await api.post('/rag/retrieve', { question: query, topK: 5 })
          if (ragRes.data.context && ragRes.data.context.trim()) {
            contextFromRag = ragRes.data.context.trim()
          }
        } catch (_) {}
      }
      const ragBlock = contextFromRag
        ? `Reference material from the user's documents (use to improve accuracy):\n\n---\n${contextFromRag}\n---\n\n`
        : ''
      const prompt = `${ragBlock}Please review and improve the following policy memo. Provide an enhanced version with better structure, clarity, and recommendations. Mark all changes clearly:

${existingMemo}`

      const systemMessage = contextFromRag
        ? 'You are an expert editor. Use the provided document excerpts to strengthen the memo where relevant. Mark all changes with [MODIFIED] tags.'
        : 'You are an expert editor specializing in policy documents. Mark all changes clearly with [MODIFIED] tags.'

      try {
        const result = await callChatGPTStream(prompt, systemMessage, (chunk) => {
          setEditedMemo((prev) => prev + chunk)
        })
        const content = (result?.content || '').trim()
        if (content) setEditedMemo(content)
        else setError('Editing returned no content. Please try again.')
      } catch (streamErr) {
        const msg = streamErr?.message || ''
        if (msg.includes('404')) {
          const response = await callChatGPT(prompt, systemMessage)
          const editedContent = response?.content || existingMemo
          setEditedMemo(editedContent.trim())
        } else {
          throw streamErr
        }
      }
    } catch (err) {
      console.error(err)
      const msg = err?.message || ''
      setError(msg.includes('Network') || err?.request ? 'Network error. Please try again.' : (msg || 'Error editing memo. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleChat = async () => {
    if (!chatInput.trim()) return

    setError('')
    const userMessage = { role: 'user', content: chatInput }
    const newHistory = [...chatHistory, userMessage]
    setChatHistory(newHistory)
    setChatInput('')
    setLoading(true)

    try {
      const contextPrompt = `Based on the following policy memo and conversation history, the user is asking: "${chatInput}". Please provide a helpful response.

Memo: ${generatedMemo}

Previous conversation:
${newHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      
      const response = await callChatGPT(contextPrompt, 'You are a helpful assistant that helps refine policy memos.')
      
      const assistantMessage = { role: 'assistant', content: response.content || 'I can help you refine the memo. What specific changes would you like to make?' }
      setChatHistory([...newHistory, assistantMessage])
    } catch (err) {
      console.error(err)
      setError('Reply failed. Please try again.')
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
            <h1 className="text-2xl font-bold text-gray-800">Policy Memo Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 shrink-0" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Mode Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => { setMode('generate'); setError('') }}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                mode === 'generate'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Generate New Memo
            </button>
            <button
              onClick={() => { setMode('edit'); setError('') }}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                mode === 'edit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Edit Existing Memo
            </button>
          </div>
        </div>

        {mode === 'generate' ? (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Research Question</h2>
              <textarea
                value={question}
                onChange={handleQuestionChange}
                placeholder="Enter your research question here. For example: 'What are the economic impacts of implementing a carbon tax policy?'"
                className={`w-full h-32 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none ${
                  questionError ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={2000}
              />
              {questionError && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <span>{questionError}</span>
                </div>
              )}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Word Count (Optional)
                </label>
                <input
                  type="number"
                  value={wordCount}
                  onChange={handleWordCountChange}
                  placeholder="e.g., 1000"
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  maxLength={10}
                  min="0"
                />
              </div>
              {ragAvailable && (
                <div className="mt-4 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRag}
                      onChange={(e) => setUseRag(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Use my knowledge base</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/documents')}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Manage documents
                  </button>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Generating…' : 'Generate Memo'}
              </button>
            </div>

            {/* Generated Memo */}
            {(generatedMemo || loading) && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">Generated Memo</h2>
                  {generatedMemo && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedMemo, 'Copied!')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        {copyFeedback === 'Copied!' ? copyFeedback : 'Copy as text'}
                      </button>
                      <button
                        onClick={() => handleDownload(generatedMemo, getGeneratedDownloadFilename())}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
                <div className="prose max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-sm min-h-[120px]">
                  {loading && !generatedMemo && <p className="text-gray-500">Generating memo…</p>}
                  {generatedMemo && <ReactMarkdown>{generatedMemo}</ReactMarkdown>}
                </div>
              </div>
            )}

            {/* Chat Section */}
            {generatedMemo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Refine Your Memo</h2>
                <div className="border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto mb-4 bg-gray-50">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] p-3 rounded-lg text-left ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        {msg.role === 'user' ? (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        ) : (
                          <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={handleChatInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Ask for modifications..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    maxLength={1000}
                  />
                  <button
                    onClick={handleChat}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Your Existing Memo</h2>
              <textarea
                value={existingMemo}
                onChange={handleExistingMemoChange}
                placeholder="Paste your existing policy memo here..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                maxLength={50000}
              />
              {ragAvailable && (
                <div className="mt-4 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRag}
                      onChange={(e) => setUseRag(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Use my knowledge base</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/documents')}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Manage documents
                  </button>
                </div>
              )}
              <button
                onClick={handleEdit}
                disabled={loading}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Editing…' : 'Edit & Improve Memo'}
              </button>
            </div>

            {(editedMemo || loading) && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">Edited Memo (Changes Marked)</h2>
                  {editedMemo && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(editedMemo, 'Copied!')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        {copyFeedback === 'Copied!' ? copyFeedback : 'Copy as text'}
                      </button>
                      <button
                        onClick={() => handleDownload(editedMemo, getEditedDownloadFilename())}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
                <div className="prose max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-sm min-h-[120px]">
                  {loading && !editedMemo && <p className="text-gray-500">Editing memo…</p>}
                  {editedMemo && <ReactMarkdown>{editedMemo}</ReactMarkdown>}
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Note: Lines marked with [MODIFIED] indicate changes made to improve the memo.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default PolicyMemoGenerator

