import { useState, useEffect } from 'react'
import { getPreferredModel, PREFERRED_MODEL_KEY } from '../utils/api'

const MODEL_OPTIONS = [
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'Default (balanced)' },
  { id: 'gpt-5-nano', label: 'GPT-5 nano', desc: 'Fastest' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', desc: 'Fast' },
  { id: 'gpt-5.2', label: 'GPT-5.2', desc: 'Best quality' },
  { id: 'gpt-4.1', label: 'GPT-4.1', desc: 'Balanced' },
]

export default function ModelSelector() {
  const [preferredModel, setPreferredModel] = useState(getPreferredModel())

  useEffect(() => {
    const handler = () => setPreferredModel(getPreferredModel())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const handleChange = (e) => {
    const value = e.target.value
    setPreferredModel(value)
    localStorage.setItem(PREFERRED_MODEL_KEY, value)
  }

  const current = MODEL_OPTIONS.find(o => o.id === preferredModel) || MODEL_OPTIONS[0]
  const displayValue = MODEL_OPTIONS.some(o => o.id === preferredModel) ? preferredModel : 'gpt-4o'

  return (
    <div className="relative flex items-center gap-2 pl-3 pr-8 py-2 rounded-xl bg-white/80 border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200/60 transition-all duration-200">
      <span className="text-lg" title="AI Model">✨</span>
      <select
        value={displayValue}
        onChange={handleChange}
        className="text-sm font-medium text-gray-800 bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none appearance-none min-w-[120px] [&::-ms-expand]:hidden"
        title={`Current: ${current.label} (${current.desc})`}
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label} · {opt.desc}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 pointer-events-none text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  )
}
