import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength, containsProfanity } from '../utils/security'

function PolicyMemoGenerator() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('generate') // 'generate' or 'edit'
  const [question, setQuestion] = useState('')
  const [wordCount, setWordCount] = useState('')
  const [existingMemo, setExistingMemo] = useState('')
  const [generatedMemo, setGeneratedMemo] = useState('')
  const [editedMemo, setEditedMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [questionError, setQuestionError] = useState('')

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
    // 验证输入 - 拒绝包含脏话的输入
    const validation = validateAndSanitizeText(question, {
      maxLength: 2000,
      minLength: 10,
      required: true,
      filterProfanity: false // 改为 false，直接拒绝脏话而不是过滤
    })

    if (!validation.valid) {
      alert(validation.message || 'Please check your input')
      return
    }

    if (!question.trim()) {
      alert('Please enter a research question')
      return
    }

    setLoading(true)
    try {
      // 使用清理后的输入
      const cleanedQuestion = validation.cleaned
      const prompt = `Generate a structured policy memo for the following research question: "${cleanedQuestion}"${wordCount ? ` The memo should be approximately ${wordCount} words.` : ''}

Please structure the memo with:
1. Executive Summary
2. Problem Statement
3. Key Points
4. Analysis
5. Actionable Recommendations
6. Conclusion

Make it professional, well-structured, and suitable for policy decision-making.`

      const response = await callChatGPT(prompt, 'You are an expert policy analyst specializing in economics and public policy.')
      
      const memoContent = response.content || 'Failed to generate memo. Please try again.'
      setGeneratedMemo(memoContent)
      setChatHistory([{ role: 'user', content: question }, { role: 'assistant', content: memoContent }])
    } catch (error) {
      alert('Error generating memo. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!existingMemo.trim()) {
      alert('Please enter your existing memo')
      return
    }

    setLoading(true)
    try {
      const prompt = `Please review and improve the following policy memo. Provide an enhanced version with better structure, clarity, and recommendations. Mark all changes clearly:

${existingMemo}`

      const response = await callChatGPT(prompt, 'You are an expert editor specializing in policy documents. Mark all changes clearly with [MODIFIED] tags.')
      
      const editedContent = response.content || existingMemo
      setEditedMemo(editedContent)
    } catch (error) {
      alert('Error editing memo. Please try again.')
      console.error(error)
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

    const userMessage = { role: 'user', content: chatInput }
    setChatHistory([...chatHistory, userMessage])
    setChatInput('')
    setLoading(true)

    try {
      const contextPrompt = `Based on the following policy memo and conversation history, the user is asking: "${chatInput}". Please provide a helpful response.

Memo: ${generatedMemo}

Previous conversation:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      
      const response = await callChatGPT(contextPrompt, 'You are a helpful assistant that helps refine policy memos.')
      
      const assistantMessage = { role: 'assistant', content: response.content || 'I can help you refine the memo. What specific changes would you like to make?' }
      setChatHistory([...chatHistory, userMessage, assistantMessage])
    } catch (error) {
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
            <h1 className="text-2xl font-bold text-gray-800">Policy Memo Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('generate')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                mode === 'generate'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Generate New Memo
            </button>
            <button
              onClick={() => setMode('edit')}
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
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Memo'}
              </button>
            </div>

            {/* Generated Memo */}
            {generatedMemo && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Generated Memo</h2>
                  <button
                    onClick={() => handleDownload(generatedMemo, 'policy-memo.md')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Download
                  </button>
                </div>
                <div className="prose max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-sm">
                  <ReactMarkdown>{generatedMemo}</ReactMarkdown>
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
                      <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
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
              <button
                onClick={handleEdit}
                disabled={loading}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Editing...' : 'Edit & Improve Memo'}
              </button>
            </div>

            {editedMemo && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Edited Memo (Changes Marked)</h2>
                  <button
                    onClick={() => handleDownload(editedMemo, 'edited-memo.md')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Download
                  </button>
                </div>
                <div className="prose max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-sm">
                  <ReactMarkdown>{editedMemo}</ReactMarkdown>
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

