import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Logo from '../components/Logo'

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim())
  const rows = lines.slice(1, 11).map(line => {
    const values = line.split(',').map(v => v.replace(/^["']|["']$/g, '').trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
  return { headers, rows }
}

function NLCodeRunner() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const promptRef = useRef(null)
  const generateRequestId = useRef(0)

  const [language, setLanguage] = useState('R')
  const [prompt, setPrompt] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [file, setFile] = useState(null) // single CSV: { name, columns, rows }
  const [library, setLibrary] = useState({ default: { R: {}, Stata: {} } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const insertVariableIntoPrompt = (varName) => {
    const ta = promptRef.current
    const start = ta ? ta.selectionStart : prompt.length
    const end = ta ? ta.selectionEnd : prompt.length
    const before = prompt.slice(0, start)
    const after = prompt.slice(end)
    const needSpace = start > 0 && before[before.length - 1] !== ' ' && before[before.length - 1] !== '\n'
    const insert = (needSpace ? ' ' : '') + varName
    const newPrompt = before + insert + after
    setPrompt(newPrompt)
    const newCursor = start + insert.length
    setTimeout(() => {
      if (promptRef.current) {
        promptRef.current.focus()
        promptRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 0)
  }

  useEffect(() => {
    api.get('/nl-code-runner/library').then(res => setLibrary(res.data)).catch(() => setLibrary({ default: { R: {}, Stata: {} } }))
  }, [])

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f || !f.name.endsWith('.csv')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result)
      setFile({ name: f.name, columns: headers, rows })
    }
    reader.readAsText(f)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = () => setFile(null)

  const defaultKeys = language === 'R' ? Object.keys(library.default?.R || {}) : Object.keys(library.default?.Stata || {})
  const allColumns = file?.columns || []

  // Parse \snippet_key or natural language; return { promptForApi, codeLibraryKeys }
  const parsePrompt = (raw) => {
    const trimmed = raw.trim()
    const slashMatch = trimmed.match(/^\\([\w]+)\s*(.*)$/s)
    if (slashMatch) {
      const key = slashMatch[1]
      const rest = (slashMatch[2] || '').trim()
      if (defaultKeys.includes(key)) {
        return {
          promptForApi: rest || `Generate code using the "${key.replace(/_/g, ' ')}" snippet with the selected variables.`,
          codeLibraryKeys: [key]
        }
      }
    }
    return { promptForApi: trimmed, codeLibraryKeys: [] }
  }

  const runGenerate = async (promptText) => {
    const { promptForApi, codeLibraryKeys } = parsePrompt(promptText)
    if (!promptForApi) return
    generateRequestId.current += 1
    const myId = generateRequestId.current
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/nl-code-runner/generate', {
        prompt: promptForApi,
        language,
        codeLibraryKeys,
        userSnippetIds: [],
        selectedVariables: {},
        fileNames: file ? [file.name] : []
      })
      if (myId === generateRequestId.current) {
        setGeneratedCode(res.data.code || '')
      }
    } catch (err) {
      if (myId === generateRequestId.current) {
        setError(err.response?.data?.message || err.message || 'Failed to generate code')
        setGeneratedCode('')
      }
    } finally {
      if (myId === generateRequestId.current) setLoading(false)
    }
  }

  const handleGenerate = () => runGenerate(prompt)

  const copyToClipboard = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode).then(() => alert('Copied to clipboard!'))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profession-dashboard')} className="text-gray-600 hover:text-gray-900">← Back</button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Natural Language R / Stata Code</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Single CSV upload + variables */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Data</h2>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm">Upload CSV</label>
          {file && (
            <>
              <span className="ml-2 text-sm text-gray-600">{file.name}</span>
              <button type="button" onClick={removeFile} className="ml-2 text-red-600 text-sm">Remove</button>
            </>
          )}
          {allColumns.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-gray-600">Variables (click to insert): </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allColumns.map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => insertVariableIntoPrompt(col)}
                    className="px-2 py-1 text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: language, prompt, generate */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">What do you want to do?</h2>
            <div className="mb-2">
              <label className="text-sm text-gray-600">Language </label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="ml-2 border rounded px-2 py-1">
                <option value="R">R</option>
                <option value="Stata">Stata</option>
              </select>
            </div>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              placeholder="e.g. \regression or \fe_regression or: Run an OLS regression with robust standard errors."
              className="w-full h-32 border rounded-lg p-3 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Type <kbd className="px-1 bg-gray-100 rounded">\regression</kbd>, <kbd className="px-1 bg-gray-100 rounded">\did_twfe</kbd>, <kbd className="px-1 bg-gray-100 rounded">\rd</kbd>, etc., or describe in words. Manage snippets in Code Snippet Library.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Press <kbd className="px-1 bg-gray-100 rounded">Enter</kbd> to update code. <kbd className="px-1 bg-gray-100 rounded">Shift+Enter</kbd> for new line.
            </p>
            <button onClick={handleGenerate} disabled={loading} className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Generating...' : 'Refresh code'}
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          {/* Right: generated code + copy */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">Generated code</h2>
              <button onClick={copyToClipboard} disabled={!generatedCode} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm">Copy to clipboard</button>
            </div>
            <pre className="w-full h-80 overflow-auto border rounded-lg bg-gray-900 text-green-400 p-4 text-sm whitespace-pre-wrap font-mono">
              {generatedCode || '# Code will appear here after you generate.'}
            </pre>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NLCodeRunner
