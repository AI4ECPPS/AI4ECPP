import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function PaperDeconstructor() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-2xl font-bold text-gray-800">Paper Deconstructor</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center max-w-2xl mx-auto">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">To Do</h2>
          <p className="text-gray-600 mb-6">
            This feature is under development. Upload papers to extract strategies, assumptions, limitations, and summaries — coming soon.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}

export default PaperDeconstructor
