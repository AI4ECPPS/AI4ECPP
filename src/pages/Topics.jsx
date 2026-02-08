import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function Topics() {
  const navigate = useNavigate()

  const topics = [
    { id: 'urban', name: 'Urban', icon: '🏙️', description: 'Urban economics, housing markets, transportation, and city development' },
    { id: 'environment-energy', name: 'Environment & Energy', icon: '🌱', description: 'Environmental economics, climate change, renewable energy, and sustainability' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥', description: 'Health economics, healthcare systems, and public health' },
    { id: 'education', name: 'Education', icon: '📚', description: 'Education economics, human capital, school systems, and learning outcomes' },
    { id: 'development', name: 'Development', icon: '🌍', description: 'Development economics, international development, poverty reduction, and economic growth' },
    { id: 'global-conflicts', name: 'Global Conflicts', icon: '🕊️', description: 'Economics of conflict, war, peace, and international relations' },
    { id: 'finance', name: 'Finance', icon: '💰', description: 'Financial economics, banking, markets, and monetary policy' },
    { id: 'inequality', name: 'Inequality', icon: '⚖️', description: 'Income inequality, wealth distribution, and social mobility' },
  ]

  const handleTopicClick = (topicId) => {
    navigate(`/topics/${topicId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Topics</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore Research Topics</h2>
          <p className="text-gray-600">Discover resources and information about different fields in Public Policy and Applied Economics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => handleTopicClick(topic.id)}
              className="bg-white rounded-xl shadow-md p-6 cursor-pointer transform transition hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-indigo-300"
            >
              <div className="text-4xl mb-4">{topic.icon}</div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">{topic.name}</h4>
              <p className="text-gray-600 text-sm">{topic.description}</p>
              <div className="mt-4 text-indigo-600 font-semibold text-sm flex items-center gap-1">
                Learn more →
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Topics

