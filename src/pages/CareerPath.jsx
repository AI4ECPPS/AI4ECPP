import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function CareerPath() {
  const navigate = useNavigate()

  const careerPaths = [
    {
      id: 'government',
      name: 'Government & Public Sector',
      icon: '🏛️',
      description: 'Work in government to shape and implement public policy at federal, state, and local levels'
    },
    {
      id: 'nonprofit-international',
      name: 'Nonprofit, NGO & International Organizations',
      icon: '🌐',
      description: 'Work with nonprofits, NGOs, and international organizations on social, economic, and global policy issues'
    },
    {
      id: 'consulting-private',
      name: 'Consulting & Private Sector',
      icon: '💼',
      description: 'Provide policy consulting services or apply policy skills in corporate settings and business environments'
    },
    {
      id: 'research',
      name: 'Research & Think Tanks',
      icon: '🔬',
      description: 'Conduct policy research and analysis at think tanks and research institutions'
    },
  ]

  const handlePathClick = (pathId) => {
    navigate(`/career-path/${pathId}`)
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
            <h1 className="text-2xl font-bold text-gray-800">Career Path</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Career Paths in Public Policy</h2>
          <p className="text-gray-600">
            Explore different career directions and opportunities available to Public Policy graduates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {careerPaths.map((path) => (
            <div
              key={path.id}
              onClick={() => handlePathClick(path.id)}
              className="bg-white rounded-xl shadow-md p-6 cursor-pointer transform transition hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-indigo-300"
            >
              <div className="text-4xl mb-4">{path.icon}</div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">{path.name}</h4>
              <p className="text-gray-600 text-sm">{path.description}</p>
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

export default CareerPath
