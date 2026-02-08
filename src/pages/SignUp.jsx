import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'
import { validateEmail, validatePassword, limitInputLength } from '../utils/security'

function SignUp({ setIsAuthenticated, inModal = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

  const handleConfirmPasswordChange = (e) => {
    const value = limitInputLength(e.target.value, 128)
    setConfirmPassword(value)
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
      setError('Please enter a password')
      return
    }
    
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/signup', { 
        email: email.trim().toLowerCase(), 
        password 
      })
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('userEmail', email.trim().toLowerCase())
        // Clear book list on signup to refresh on next visit
        localStorage.removeItem('bookList')
        localStorage.removeItem('loginTimestamp')
        if (setIsAuthenticated) {
          setIsAuthenticated(true)
        }
        if (!inModal) {
          navigate('/dashboard')
        }
      } else {
        setError('Sign up failed. Please try again.')
      }
    } catch (err) {
      // Handle registration errors properly
      if (err.response && err.response.data) {
        // Backend returned an error message
        setError(err.response.data.message || err.response.data.error || 'Registration failed')
      } else if (err.response && err.response.status === 400) {
        // Bad request - validation error or user already exists
        setError(err.response.data.message || err.response.data.error || 'Invalid input or user already exists')
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
        <p className="text-gray-600">Create your account</p>
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
              placeholder="At least 6 characters"
            />
            <p className="mt-1 text-sm text-gray-500">
              6-128 characters. Can include letters, numbers, and special characters (e.g., #, @, !, $)
            </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              maxLength={128}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="Confirm your password"
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      {!inModal && (
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Log In
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

export default SignUp

