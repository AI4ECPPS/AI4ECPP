import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function Welcome() {
  const navigate = useNavigate()

  const handleModeSelect = (mode) => {
    // 保存用户选择的模式到localStorage
    localStorage.setItem('userMode', mode)
    if (mode === 'student') {
      navigate('/dashboard')
    } else {
      navigate('/profession-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12" />
            <h1 className="text-2xl font-bold text-gray-800">AI4ECPP</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Welcome to AI4ECPP
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI Tools for Economics & Public Policy
            </p>
            <p className="text-lg text-gray-500 mt-2">
              Choose your mode to get started
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Student Mode Card */}
            <div
              onClick={() => handleModeSelect('student')}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-2"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-8 text-white">
                <div className="text-6xl mb-4">🎓</div>
                <h3 className="text-2xl font-bold mb-2">Student Mode</h3>
                <p className="text-white/90 text-sm">
                  For students learning economics and public policy
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-500">✓</span>
                    Interview practice & preparation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-500">✓</span>
                    Research tools & paper analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-500">✓</span>
                    Find professors & programs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-500">✓</span>
                    Learning resources & book lists
                  </li>
                </ul>
                <div className="mt-6 flex items-center justify-center text-indigo-600 font-semibold group-hover:text-indigo-700">
                  Enter Student Mode
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Profession Mode Card */}
            <div
              onClick={() => handleModeSelect('profession')}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-emerald-200 transform hover:-translate-y-2"
            >
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white">
                <div className="text-6xl mb-4">💼</div>
                <h3 className="text-2xl font-bold mb-2">Profession Mode</h3>
                <p className="text-white/90 text-sm">
                  For researchers and professionals in the field
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    Advanced empirical analysis tools
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    Paper deconstruction & review
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    Policy memo generation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    Professional research workflow
                  </li>
                </ul>
                <div className="mt-6 flex items-center justify-center text-emerald-600 font-semibold group-hover:text-emerald-700">
                  Enter Profession Mode
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-gray-500 text-sm">
          © 2026 Yuhuan. All rights reserved. | Author: Yuhuan | Got feedback? I'm all ears! 👂
        </p>
      </footer>
    </div>
  )
}

export default Welcome

