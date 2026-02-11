import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Login from './Login'
import SignUp from './SignUp'

function Dashboard({ isAuthenticated, setIsAuthenticated, isGuest = false }) {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [userEmail, setUserEmail] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 访客可以访问的工具列表
  const guestAccessibleTools = ['outside-links', 'book-list', 'find-professors', 'offer-generator', 'knowledge', 'topics', 'career-path', 'paper-replication']

  useEffect(() => {
    // Check authentication status and update user email
    const token = localStorage.getItem('authToken')
    const email = localStorage.getItem('userEmail')
    const guestMode = localStorage.getItem('guestMode') === 'true'
    setUserEmail(email || '')
    if (token && setIsAuthenticated) {
      setIsAuthenticated(true)
      // Clear guest mode when user logs in
      if (guestMode) {
        localStorage.removeItem('guestMode')
      }
    }
  }, [setIsAuthenticated])

  // Listen for storage changes (when login happens in modal)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('authToken')
      const email = localStorage.getItem('userEmail')
      setUserEmail(email || '')
      if (token && setIsAuthenticated) {
        setIsAuthenticated(true)
        setShowAuthModal(false)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check periodically in case login happens in same window
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken')
      if (token && !isAuthenticated && setIsAuthenticated) {
        setIsAuthenticated(true)
        setShowAuthModal(false)
      }
    }, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [isAuthenticated, setIsAuthenticated])

  const handleRagButtonClick = () => {
    if (isGuest || !isAuthenticated) {
      setAuthMode('login')
      setShowAuthModal(true)
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 3000)
    } else {
      navigate('/documents')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('guestMode')
    setUserEmail('')
    if (setIsAuthenticated) {
      setIsAuthenticated(false)
    }
    window.location.reload()
  }

  const handleSwitchMode = () => {
    localStorage.setItem('userMode', 'profession')
    navigate('/profession-dashboard')
  }

  const handleToolClick = (toolId) => {
    if (isAuthenticated) {
      navigate(`/${toolId}`)
    } else if (isGuest) {
      // 访客模式：检查是否可以访问
      if (guestAccessibleTools.includes(toolId)) {
        navigate(`/${toolId}`)
      } else {
        // 显示需要登录的提示
        setShowLoginPrompt(true)
        setTimeout(() => setShowLoginPrompt(false), 3000) // 3秒后自动关闭
      }
    } else {
      setAuthMode('login')
      setShowAuthModal(true)
    }
  }

  const handleLoginSuccess = () => {
    const email = localStorage.getItem('userEmail')
    setUserEmail(email || '')
    // Clear guest mode when user logs in
    localStorage.removeItem('guestMode')
    if (setIsAuthenticated) {
      setIsAuthenticated(true)
    }
    setShowAuthModal(false)
  }

  const handleSignUpSuccess = () => {
    const email = localStorage.getItem('userEmail')
    setUserEmail(email || '')
    // Clear guest mode when user signs up
    localStorage.removeItem('guestMode')
    if (setIsAuthenticated) {
      setIsAuthenticated(true)
    }
    setShowAuthModal(false)
  }

  const mainTools = [
    { id: 'empirical-copilot', title: 'Empirical Copilot', description: 'Generate R/Python/Stata code from text descriptions or formula screenshots from papers', icon: '💻', color: 'from-green-500 to-emerald-500' },
    { id: 'interview-trainer', title: 'Interview Trainer', description: 'Practice Predoc technical interviews with AI-generated questions', icon: '🎯', color: 'from-amber-500 to-orange-500' },
    { id: 'cover-letter-editor', title: 'Cover Letter Editor', description: 'Upload your cover letter and job description to get AI-powered revision suggestions with highlighted changes', icon: '✉️', color: 'from-sky-500 to-blue-500' },
    { id: 'offer-generator', title: 'Offer Generator', description: 'Generate humorous fake offer letters for academic and industry positions', icon: '🎉', color: 'from-yellow-500 to-amber-500' },
    { id: 'pic-to-latex', title: 'Formula to LaTeX', description: 'Convert formulas to LaTeX: upload images or describe in words (e.g., "Cobb-Douglas function", "LATE formula")', icon: '🔢', color: 'from-violet-500 to-purple-500' },
    { id: 'proof-writer', title: 'Proof Writer', description: 'Upload a formula image and generate a mathematical proof or explanation', icon: '✍️', color: 'from-purple-600 to-indigo-600' },
    { id: 'paper-deconstructor', title: 'Paper Deconstructor', description: 'Upload papers to extract strategies, assumptions, limitations, and summaries', icon: '📄', color: 'from-orange-500 to-red-500' },
    { id: 'policy-memo', title: 'Policy Memo Generator', description: 'Generate structured policy memos with key points and actionable recommendations', icon: '📝', color: 'from-blue-500 to-cyan-500' },
    { id: 'literature-helper', title: 'Literature Review Helper', description: 'Upload a PDF paper to get a concise summary suitable for your literature review', icon: '📚', color: 'from-amber-500 to-orange-600' },
  ]

  const resourceTools = [
    { id: 'find-professors', title: 'Find Professors', description: 'Search for economics professors by name or research field and school', icon: '👨‍🏫', color: 'from-teal-500 to-cyan-500' },
    { id: 'book-list', title: 'Book List', description: 'Recommended books in economics and public policy by professors', icon: '📚', color: 'from-purple-500 to-pink-500' },
    { id: 'topics', title: 'Topics', description: 'Explore research topics in Public Policy and Applied Economics with resources and links', icon: '📑', color: 'from-rose-500 to-pink-500' },
    { id: 'knowledge', title: 'Knowledge Base', description: 'Essential knowledge points and key concepts in economics, econometrics, and data analysis', icon: '🧠', color: 'from-emerald-500 to-teal-500' },
    { id: 'career-path', title: 'Career Path', description: 'Explore career directions and opportunities for Public Policy graduates', icon: '🚀', color: 'from-blue-600 to-indigo-600' },
    { id: 'outside-links', title: 'Outside Links', description: 'Useful resources and links for economics and public policy research', icon: '🔗', color: 'from-indigo-500 to-blue-500' },
    { id: 'paper-replication', title: 'Paper Replication', description: 'Official data and code repository for replicating AER and other AEA journal papers', icon: '📄', color: 'from-orange-500 to-red-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">AI4ECPP</h1>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Student Mode
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSwitchMode}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
            >
              <span>💼</span>
              <span>Switch to Profession Mode</span>
            </button>
            {isAuthenticated ? (
              <>
                <span className="text-gray-600">Welcome, {userEmail}</span>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : isGuest ? (
              <>
                <span className="text-gray-500 text-sm">Guest Mode</span>
                <button
                  onClick={() => {
                    setAuthMode('login')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition font-medium"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode('login')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition font-medium"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleRagButtonClick}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 ${
                isGuest || !isAuthenticated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title={isGuest || !isAuthenticated ? 'Log in to manage your documents' : 'Add and manage documents for RAG'}
            >
              <span>📎</span>
              Upload Documents for your RAG
            </button>
            <button
              type="button"
              onClick={() => isAuthenticated && navigate('/code-snippet-library')}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 ${
                isGuest || !isAuthenticated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-sky-500 text-white hover:bg-sky-600'
              }`}
              title={isGuest || !isAuthenticated ? 'Log in to manage your code snippets' : 'Browse and upload R/Stata code snippets'}
            >
              <span>📚</span>
              Code Snippet Library
            </button>
          </div>
          {showLoginPrompt && (isGuest || !isAuthenticated) && (
            <p className="mt-4 text-sm text-amber-600">Please log in to add and manage your documents.</p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select a Tool</h2>
          <p className="text-gray-600">Choose an AI-powered tool to assist with your research. In some tools you can enable &quot;Use my knowledge base&quot; to ground answers in your uploaded documents.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {mainTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`bg-gradient-to-br ${tool.color} rounded-xl p-6 text-white cursor-pointer transform transition hover:scale-105 hover:shadow-xl`}
            >
              <div className="text-4xl mb-4">{tool.icon}</div>
              <h3 className="text-xl font-bold mb-2">{tool.title}</h3>
              <p className="text-white/90 text-sm">{tool.description}</p>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Resources Sharing</h2>
          <p className="text-gray-600">Links and resources for learning and research.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resourceTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`bg-gradient-to-br ${tool.color} rounded-xl p-6 text-white cursor-pointer transform transition hover:scale-105 hover:shadow-xl`}
            >
              <div className="text-4xl mb-4">{tool.icon}</div>
              <h3 className="text-xl font-bold mb-2">{tool.title}</h3>
              <p className="text-white/90 text-sm">{tool.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600 text-sm">
          © 2026 Yuhuan. All rights reserved. | Author: Yuhuan | Got feedback? I'm all ears! 👂
        </p>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <div className="p-8">
              {authMode === 'login' ? (
                <div>
                  <Login 
                    setIsAuthenticated={handleLoginSuccess} 
                    inModal={true}
                    onGuestMode={() => {
                      localStorage.setItem('guestMode', 'true')
                      localStorage.removeItem('authToken')
                      localStorage.removeItem('userEmail')
                      setShowAuthModal(false)
                      window.location.reload()
                    }}
                  />
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setAuthMode('signup')}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                    >
                      Don't have an account? Sign Up
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <SignUp setIsAuthenticated={handleSignUpSuccess} inModal={true} />
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setAuthMode('login')}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                    >
                      Already have an account? Log In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Required Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Login Required</h3>
              <p className="text-gray-600 mb-6">
                You need to log in to access this feature.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowLoginPrompt(false)
                    setAuthMode('login')
                    setShowAuthModal(true)
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false)
                    setAuthMode('signup')
                    setShowAuthModal(true)
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
