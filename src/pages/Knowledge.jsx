import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function Knowledge() {
  const navigate = useNavigate()

  const knowledgeTopics = [
    { 
      id: 'microeconomics', 
      name: 'Microeconomics', 
      icon: '📊', 
      description: 'Consumer theory, producer theory, market structures, and welfare economics' 
    },
    { 
      id: 'econometrics', 
      name: 'Econometrics', 
      icon: '📈', 
      description: 'Statistical methods for economic data analysis and causal inference' 
    },
    { 
      id: 'game-theory', 
      name: 'Game Theory', 
      icon: '🎲', 
      description: 'Strategic interactions, Nash equilibrium, and decision-making under uncertainty' 
    },
    { 
      id: 'data-analysis', 
      name: 'Data Analysis', 
      icon: '💾', 
      description: 'Data manipulation, visualization, and statistical analysis techniques' 
    },
    { 
      id: 'industrial-organization', 
      name: 'Industrial Organization', 
      icon: '🏭', 
      description: 'Market structure, competition, pricing strategies, and firm behavior' 
    },
    { 
      id: 'gis', 
      name: 'GIS', 
      icon: '🗺️', 
      description: 'Geographic Information Systems for spatial data analysis and mapping' 
    },
  ]

  const handleTopicClick = (topicId) => {
    navigate(`/knowledge/${topicId}`)
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
            <h1 className="text-2xl font-bold text-gray-800">Knowledge Base</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Essential Knowledge Topics</h2>
          <p className="text-gray-600">Explore key concepts and important knowledge points in economics and data analysis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeTopics.map((topic) => (
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

export default Knowledge

