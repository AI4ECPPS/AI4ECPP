import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Logo from '../components/Logo'

// Shortcut keys for default snippets: R = Ctrl+Alt+key, Stata = Ctrl+Alt+Shift+key
const SHORTCUT_KEYS = '1234567890qwertyuiopasdfghjkl'.split('')

function shortcutLabel(keyIndex, forStata) {
  const mod = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? '⌘⌥' : 'Ctrl+Alt'
  const key = SHORTCUT_KEYS[keyIndex]
  return forStata ? `${mod}+Shift+${key}` : `${mod}+${key}`
}

function CodeSnippetLibrary() {
  const navigate = useNavigate()
  const [library, setLibrary] = useState({ default: { R: {}, Stata: {} }, user: [] })
  const [userSnippets, setUserSnippets] = useState([])
  const [addSnippet, setAddSnippet] = useState({ name: '', language: 'R', description: '', snippet: '' })
  const [loadingSnippets, setLoadingSnippets] = useState(false)
  const [activeTab, setActiveTab] = useState('R') // for default library view: 'R' | 'Stata'
  const [copyFeedback, setCopyFeedback] = useState(null) // { lang, index } to show "Copied!"

  const loadLibrary = () => {
    api.get('/nl-code-runner/library').then(res => setLibrary(res.data)).catch(() => setLibrary({ default: { R: {}, Stata: {} }, user: [] }))
  }
  const loadUserSnippets = () => {
    api.get('/nl-code-runner/snippets').then(res => setUserSnippets(res.data)).catch(() => setUserSnippets([]))
  }

  useEffect(() => {
    loadLibrary()
    loadUserSnippets()
  }, [])

  const handleAddSnippet = async () => {
    if (!addSnippet.name.trim() || !addSnippet.snippet.trim()) {
      alert('Name and snippet are required')
      return
    }
    setLoadingSnippets(true)
    try {
      await api.post('/nl-code-runner/snippets', addSnippet)
      setAddSnippet({ name: '', language: 'R', description: '', snippet: '' })
      loadUserSnippets()
      loadLibrary()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add snippet')
    } finally {
      setLoadingSnippets(false)
    }
  }

  const handleDeleteSnippet = async (id) => {
    if (!confirm('Delete this snippet?')) return
    try {
      await api.delete(`/nl-code-runner/snippets/${id}`)
      setUserSnippets(prev => prev.filter(s => s.id !== id))
      loadLibrary()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  const defaultR = library.default?.R || {}
  const defaultStata = library.default?.Stata || {}
  const rEntries = Object.entries(defaultR)
  const stataEntries = Object.entries(defaultStata)

  const copySnippetToClipboard = useCallback((text, lang, index) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback({ lang, index })
      setTimeout(() => setCopyFeedback(null), 1500)
    }).catch(() => alert('Copy failed'))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key?.toLowerCase()
      const keyIndex = SHORTCUT_KEYS.indexOf(key)
      if (keyIndex < 0) return
      const isStata = e.shiftKey
      const isMod = e.ctrlKey || e.metaKey
      const isAlt = e.altKey
      if (!isMod || !isAlt) return
      const rList = Object.values(library.default?.R || {})
      const sList = Object.values(library.default?.Stata || {})
      if (isStata) {
        if (keyIndex < sList.length) {
          e.preventDefault()
          const snippet = sList[keyIndex]?.snippet
          if (snippet) copySnippetToClipboard(snippet, 'Stata', keyIndex)
        }
      } else {
        if (keyIndex < rList.length) {
          e.preventDefault()
          const snippet = rList[keyIndex]?.snippet
          if (snippet) copySnippetToClipboard(snippet, 'R', keyIndex)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [library.default, copySnippetToClipboard])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profession-dashboard')} className="text-gray-600 hover:text-gray-900">← Back</button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Code Snippet Library</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Use these snippets in Natural Language R/Stata Code: upload a CSV, type <kbd className="px-1 bg-white rounded text-xs">\regression</kbd> or describe what you want, then press Enter to generate code.
          </p>
          <button
            type="button"
            onClick={() => navigate('/nl-code-runner')}
            className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Go to Natural Language R/Stata Code →
          </button>
        </div>
        {/* Existing (default) code snippets */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Existing code snippets</h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('R')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'R' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              R
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('Stata')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'Stata' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Stata
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            R: <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt</kbd> + key. Stata: <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt+Shift</kbd> + key. (Mac: <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">⌘⌥</kbd>)
          </p>
          <div className="space-y-4">
            {(activeTab === 'R' ? rEntries : stataEntries).map(([key, item], index) => {
              const isStata = activeTab === 'Stata'
              const shortKey = SHORTCUT_KEYS[index]
              const label = shortcutLabel(index, isStata)
              const justCopied = copyFeedback?.lang === (isStata ? 'Stata' : 'R') && copyFeedback?.index === index
              return (
                <div key={key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{item.name || key}</span>
                      <span className="text-xs text-gray-500">({key.replace(/_/g, ' ')})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="text-xs text-gray-500 font-mono bg-gray-200 px-1.5 py-0.5 rounded">{label}</kbd>
                      <button
                        type="button"
                        onClick={() => copySnippetToClipboard(item.snippet || '', isStata ? 'Stata' : 'R', index)}
                        className="px-2 py-1 text-sm bg-sky-600 text-white rounded hover:bg-sky-700"
                      >
                        {justCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}
                  <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono">{item.snippet || ''}</pre>
                </div>
              )
            })}
            {(activeTab === 'R' ? rEntries : stataEntries).length === 0 && (
              <p className="text-gray-500 text-sm">No default snippets for this language.</p>
            )}
          </div>
        </section>

        {/* My snippets: add + list */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">My snippets</h2>
          <p className="text-sm text-gray-600 mb-4">Add your own R or Stata snippets to use in Natural Language R/Stata Code.</p>
          <div className="border rounded-lg p-4 bg-gray-50 mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Add new snippet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Name *"
                value={addSnippet.name}
                onChange={e => setAddSnippet(s => ({ ...s, name: e.target.value }))}
                className="border rounded px-3 py-2"
              />
              <select
                value={addSnippet.language}
                onChange={e => setAddSnippet(s => ({ ...s, language: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                <option value="R">R</option>
                <option value="Stata">Stata</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={addSnippet.description}
              onChange={e => setAddSnippet(s => ({ ...s, description: e.target.value }))}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <textarea
              placeholder="Code snippet *"
              value={addSnippet.snippet}
              onChange={e => setAddSnippet(s => ({ ...s, snippet: e.target.value }))}
              className="w-full h-28 border rounded p-3 font-mono text-sm"
            />
            <button
              onClick={handleAddSnippet}
              disabled={loadingSnippets}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm"
            >
              {loadingSnippets ? 'Adding...' : 'Add snippet'}
            </button>
          </div>
          <h3 className="font-medium text-gray-800 mb-2">Your snippets</h3>
          {userSnippets.length === 0 ? (
            <p className="text-gray-500 text-sm">No snippets yet. Add one above.</p>
          ) : (
            <ul className="space-y-3">
              {userSnippets.map(s => (
                <li key={s.id} className="flex items-start justify-between border rounded-lg p-3 bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({s.language})</span>
                    {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                    <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto max-h-24 font-mono">{s.snippet}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnippet(s.id)}
                    className="ml-3 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default CodeSnippetLibrary
