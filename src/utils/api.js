import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api'

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

// ChatGPT API integration helper
export const callChatGPT = async (prompt, systemMessage = '') => {
  try {
    const response = await api.post('/chatgpt', {
      prompt,
      systemMessage,
    })
    // Return the content directly for easier use in components
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

export default api

