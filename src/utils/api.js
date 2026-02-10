import axios from 'axios'

// Use /api: in dev Vite proxies to localhost:3001; in production same-origin. Override with VITE_API_BASE_URL if needed.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ChatGPT API integration helper. options: { temperature } (e.g. 0.3 for code)
export const callChatGPT = async (prompt, systemMessage = '', options = {}) => {
  try {
    const body = { prompt, systemMessage }
    if (options.temperature != null) body.temperature = options.temperature
    const response = await api.post('/chatgpt', body)
    return {
      content: response.data.content,
      model: response.data.model,
      usage: response.data.usage
    }
  } catch (error) {
    console.error('ChatGPT API error:', error)
    if (error.response) {
      throw new Error(error.response.data.message || error.response.data.error || 'API request failed')
    }
    throw error
  }
}

/** Stream ChatGPT response; onChunk(content) called for each delta; returns full content when done. */
export const callChatGPTStream = async (prompt, systemMessage = '', onChunk) => {
  const token = localStorage.getItem('authToken')
  const base = api.defaults.baseURL || '/api'
  const fullBase = base.startsWith('http') ? base.replace(/\/$/, '') : (window.location.origin + (base.startsWith('/') ? base : '/' + base).replace(/\/+$/, ''))
  const url = fullBase + '/chatgpt/stream'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ prompt, systemMessage, temperature: 0.3 })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error || `Request failed ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const obj = JSON.parse(data)
          if (obj.content) {
            full += obj.content
            if (onChunk) onChunk(obj.content)
          }
        } catch (_) {}
      }
    }
  }
  return { content: full }
}

export default api

