import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../utils/api'

const MAX_DOCUMENTS = 10
const MAX_CONTENT_LENGTH = 500000

function MyDocuments() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [available, setAvailable] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [viewContent, setViewContent] = useState('')
  const [viewLoading, setViewLoading] = useState(false)

  const load = () => {
    api.get('/rag/documents').then(r => setDocuments(r.data.documents || [])).catch(() => setDocuments([]))
  }

  useEffect(() => {
    api.get('/rag/health').then(r => {
      setAvailable(r.data.status === 'ok')
      if (r.data.status === 'ok') load()
    }).catch(() => setAvailable(false))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Please enter a title and content.')
      return
    }
    if (documents.length >= MAX_DOCUMENTS) {
      setError(`Maximum ${MAX_DOCUMENTS} documents. Delete one to add another.`)
      return
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content is too long (max ${MAX_CONTENT_LENGTH.toLocaleString()} characters). Please shorten your document.`)
      return
    }
    setAdding(true)
    try {
      await api.post('/rag/documents', { title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      load()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add document.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    setError('')
    setDeletingId(id)
    if (viewingDoc?.id === id) setViewingDoc(null)
    try {
      await api.delete(`/rag/documents/${encodeURIComponent(id)}`)
      load()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message
      const status = err.response?.status
      setError(status === 404
        ? 'Document not found or no permission. If it was added before, try logging out and back in, then delete again.'
        : msg ? `Delete failed: ${msg}` : 'Delete failed. Check network or try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleView = async (d) => {
    setViewingDoc(d)
    setViewContent('')
    setViewLoading(true)
    setError('')
    try {
      const r = await api.get(`/rag/documents/${encodeURIComponent(d.id)}`)
      setViewContent(r.data.content ?? '')
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Network error'
      const status = err.response?.status
      setViewContent(status === 404
        ? '(Document not found. It may have been created before account linking—try deleting and re-adding it.)'
        : `(Failed to load: ${msg})`)
    } finally {
      setViewLoading(false)
    }
  }

  const atLimit = documents.length >= MAX_DOCUMENTS

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">My Documents</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {available === false && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Documents require a database (PostgreSQL with pgvector). Set DATABASE_URL to enable.
          </div>
        )}

        {available === true && (
          <>
            <p className="text-gray-600 mb-6">
              Add up to {MAX_DOCUMENTS} documents. They will be used when you enable &quot;Use my knowledge base&quot; in tools like Policy Memo Generator.
            </p>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Add document ({documents.length} / {MAX_DOCUMENTS})</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Course notes Ch1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={500}
                    disabled={atLimit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (paste text)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste document text here..."
                    rows={6}
                    maxLength={MAX_CONTENT_LENGTH}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={atLimit}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} characters
                  </p>
                </div>
                {atLimit && (
                  <p className="text-sm text-amber-600">You have reached the maximum of {MAX_DOCUMENTS} documents. Delete one to add another.</p>
                )}
                <button
                  type="submit"
                  disabled={adding || atLimit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add document'}
                </button>
              </form>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Your documents</h2>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents yet. Add one above.</p>
              ) : (
                <ul className="space-y-3">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => handleView(d)}
                        className="flex-1 text-left min-w-0 hover:bg-gray-50 rounded px-2 py-1 -mx-2"
                      >
                        <span className="font-medium text-gray-800">{d.title}</span>
                        <span className="ml-2 text-sm text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(d.id) }}
                        disabled={deletingId === d.id}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 shrink-0"
                      >
                        {deletingId === d.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

            {viewingDoc && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingDoc(null)}>
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">{viewingDoc.title}</h3>
                    <button onClick={() => setViewingDoc(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                  </div>
                  <div className="p-4 overflow-auto flex-1">
                    {viewLoading ? (
                      <p className="text-gray-500">Loading...</p>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 p-4 rounded-lg max-h-[60vh] overflow-auto">{viewContent || '(No content)'}</pre>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default MyDocuments
