import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Login from './Login'
import SignUp from './SignUp'

function ProfessionDashboard({ isAuthenticated, setIsAuthenticated, isGuest = false }) {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
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
      id: 'game-theory-lab',
      title: 'Game Theory Lab',
      description: 'Experiment with 2×2 games: enter payoffs, find pure-strategy Nash equilibria, and get R code to reproduce the analysis.',
      icon: '🎲',
      color: 'from-lime-500 to-green-600',
    },
    {
      id: 'microeconomics-lab',
      title: 'Microeconomics Lab',
      description: 'Linear demand and supply: set parameters, see equilibrium price and quantity, and get R code with a plot.',
      icon: '📈',
      color: 'from-sky-500 to-blue-600',
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
      id: 'nl-code-runner',
      title: 'Natural Language R / Stata Code',
      description: 'Describe your analysis in plain language; get R or Stata code. Upload CSVs, select variables, use pre-built or your own code snippets, copy code to clipboard.',
      icon: '⌨️',
      color: 'from-amber-500 to-orange-600',
    },
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
      disabled: true,
      disabledMessage: 'Currently under development',
    },
    {
      id: 'policy-dl-agent',
      title: 'Policy Deep Learning Agent',
      description: 'Train a Transformer model on panel data to predict socio-economic outcomes. Define custom reward functions and optimize policy parameters.',
      icon: '🤖',
      color: 'from-indigo-500 to-purple-600',
      disabled: true, // Under maintenance
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Professional Research Tools</h2>
          <p className="text-gray-600">Advanced AI-powered tools for economists and policy researchers. Enable &quot;Use my knowledge base&quot; in supported tools to use your uploaded documents.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => tool.disabled ? null : handleToolClick(tool.id)}
              className={`rounded-xl p-6 text-white transition ${
                tool.disabled
                  ? 'bg-gray-300 cursor-not-allowed opacity-75'
                  : `bg-gradient-to-br ${tool.color} cursor-pointer transform hover:scale-105 hover:shadow-xl`
              }`}
            >
              <div className="text-4xl mb-4">{tool.icon}</div>
              <h3 className="text-xl font-bold mb-2">{tool.title}</h3>
              <p className="text-white/90 text-sm">{tool.description}</p>
              {tool.disabled && (
                <p className="mt-3 text-sm font-medium text-gray-600">{tool.disabledMessage || 'Temporarily unavailable'}</p>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600 text-sm">
          Author: Yuhuan | Made with courage and curiosity. Limited ability, but keep improving — thank you so much for your encouragement and feedback! ❤️
          <br />
          © 2026 Yuhuan. All rights reserved.
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
