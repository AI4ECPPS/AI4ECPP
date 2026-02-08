import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Login from './Login'
import SignUp from './SignUp'

function ProfessionDashboard({ isAuthenticated, setIsAuthenticated, isGuest = false }) {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [userEmail, setUserEmail] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 访客可以访问的工具列表
  const guestAccessibleTools = ['outside-links', 'book-list', 'find-professors', 'offer-generator', 'knowledge', 'topics', 'career-path']

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
    localStorage.setItem('userMode', 'student')
    navigate('/dashboard')
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

  // 专业模式的工具列表 - 实证分析AI助手
  const tools = [
    {
      id: 'policy-analyst',
      title: 'Empirical Analyst AI',
      description: 'Upload your data to perform empirical analysis, build analysis pipelines, and generate robustness checks. Upload code to auto-generate comprehensive sensitivity tests.',
      icon: '📊',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'policy-interpretation',
      title: 'Policy Interpretation AI',
      description: 'Upload your regression results and get automatic interpretation: result explanation, identification threats, policy implications, and external validity discussion.',
      icon: '📝',
      color: 'from-violet-500 to-purple-600',
    },
    {
      id: 'coding-helper',
      title: 'Coding Helper',
      description: 'Upload your R, Python, or Stata code to get line-by-line annotations, improvement suggestions, or convert between programming languages.',
      icon: '💻',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'design-checker',
      title: 'Design Checker',
      description: 'Check your survey questionnaire design or get research design advice. Includes Survey Design Checker (8 principles) and Research Design Advisor (identification strategy, threats, robustness).',
      icon: '📋🔬',
      color: 'from-rose-500 to-indigo-600',
    },
    {
      id: 'policy-dl-agent',
      title: 'Policy Deep Learning Agent',
      description: 'Train a Transformer model on panel data to predict socio-economic outcomes. Define custom reward functions and optimize policy parameters.',
      icon: '🤖',
      color: 'from-indigo-500 to-purple-600',
    },
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
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Profession Mode
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSwitchMode}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
            >
              <span>🎓</span>
              <span>Switch to Student Mode</span>
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
                  className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition font-medium"
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
                  className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition font-medium"
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Professional Research Tools</h2>
          <p className="text-gray-600">Advanced AI-powered tools for economists and policy researchers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
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
          Author: Yuhuan | Got feedback? I'm all ears! 👂
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
                      className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
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
                      className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
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
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
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

export default ProfessionDashboard
