import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../utils/api'
import ReactMarkdown from 'react-markdown'

function RAGAssistant() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')
  const [ragAvailable, setRagAvailable] = useState(null)

  useEffect(() => {
    const check = async () => {
      try {
        const r = await api.get('/rag/health')
        setRagAvailable(r.data.status === 'ok')
        if (r.data.status === 'ok') {
          const list = await api.get('/rag/documents')
          setDocuments(list.data.documents || [])
        }
      } catch {
        setRagAvailable(false)
      }
    }
    check()
  }, [])

  const MAX_CONTENT_LENGTH = 500000

  const handleAddDocument = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Please enter a title and content.')
      return
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content is too long (max ${MAX_CONTENT_LENGTH.toLocaleString()} characters). Please shorten your document.`)
      return
    }
    setError('')
    setAdding(true)
    try {
      await api.post('/rag/documents', { title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      const list = await api.get('/rag/documents')
      setDocuments(list.data.documents || [])
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add document.')
    } finally {
      setAdding(false)
    }
  }

  const handleQuery = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setError('')
    setQuerying(true)
    setAnswer('')
    setSources([])
    try {
      const r = await api.post('/rag/query', { question: question.trim(), topK: 5 })
      setAnswer(r.data.answer)
      setSources(r.data.chunksUsed || [])
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Query failed.')
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">← Back to Dashboard</button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">My Documents</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ragAvailable === true && (
          <p className="mb-6 text-sm text-gray-600">
            Documents you upload here can be used in <strong>Policy Memo Generator</strong>—enable &quot;Use my knowledge base&quot; there when generating or editing a memo.
          </p>
        )}
        {ragAvailable === false && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            Documents are unavailable: database (PostgreSQL with pgvector) is required. Set <code className="bg-amber-100 px-1">DATABASE_URL</code> and ensure the database has the <code className="bg-amber-100 px-1">vector</code> extension (e.g. Neon).
          </div>
        )}

        {ragAvailable === true && (
          <>
            {/* Add document */}
            <section className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Add document</h2>
              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Policy memo 2024"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (paste text)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste document text here..."
                    rows={8}
                    maxLength={MAX_CONTENT_LENGTH}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} characters
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add document'}
                </button>
              </form>
            </section>

            {/* Documents list */}
            <section className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Your documents ({documents.length})</h2>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents yet. Add one above.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d) => (
                    <li key={d.id} className="text-gray-700 flex items-center gap-2">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-sm text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Ask question */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Ask a question (answers use your documents)</h2>
              <form onSubmit={handleQuery} className="space-y-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are the main policy recommendations in the documents?"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={querying}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {querying ? 'Searching...' : 'Ask'}
                </button>
              </form>
              {error && <p className="mt-2 text-red-600">{error}</p>}
              {answer && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Answer</h3>
                  <div className="prose max-w-none text-gray-800">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                  {sources.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">Sources used</h3>
                      <ul className="text-sm text-gray-500 space-y-1">
                        {sources.map((s, i) => (
                          <li key={i}>{s.title}: {s.excerpt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default RAGAssistant
