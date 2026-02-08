import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'
import { validateEmail, validatePassword, limitInputLength } from '../utils/security'

function Login({ setIsAuthenticated, inModal = false, onGuestMode = null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGuestMode = () => {
    localStorage.setItem('guestMode', 'true')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    if (onGuestMode) {
      onGuestMode()
    } else if (setIsAuthenticated) {
      setIsAuthenticated(false)
    }
    if (!inModal) {
      navigate('/dashboard')
    }
  }

  const handleEmailChange = (e) => {
    const value = limitInputLength(e.target.value, 255)
    setEmail(value)
    if (error) setError('')
  }

  const handlePasswordChange = (e) => {
    const value = limitInputLength(e.target.value, 128)
    setPassword(value)
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // 前端验证
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    
    if (!password) {
      setError('Please enter your password')
      return
    }
    
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message)
      return
    }
    
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      })
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('userEmail', email.trim().toLowerCase())
        // Clear book list on login to refresh on next visit
        localStorage.removeItem('bookList')
        localStorage.removeItem('loginTimestamp')
        if (setIsAuthenticated) {
          setIsAuthenticated(true)
        }
        if (!inModal) {
          navigate('/dashboard')
        }
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err) {
      // Handle authentication errors properly
      if (err.response && err.response.data) {
        // Backend returned an error message
        setError(err.response.data.message || err.response.data.error || 'Invalid email or password')
      } else if (err.response && err.response.status === 401) {
        // Unauthorized - invalid credentials
        setError('Invalid email or password')
      } else if (err.response && err.response.status === 400) {
        // Bad request - validation error
        setError(err.response.data.message || err.response.data.error || 'Invalid input')
      } else {
        // Network error or other issues
        setError('Unable to connect to server. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AI4ECPP</h1>
        <p className="text-gray-600">AI Tools for Economics & Public Policy</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
              maxLength={255}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="your.email@example.com"
            />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
              maxLength={128}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="Enter your password"
            />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGuestMode}
          className="mt-4 w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
        >
          Continue as Guest
        </button>
      </div>

      {!inModal && (
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Sign Up
            </Link>
          </p>
        </div>
      )}
    </>
  )

  if (inModal) {
    return content
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {content}
      </div>
    </div>
  )
}

export default Login

