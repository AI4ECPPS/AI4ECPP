import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function PaperReplication() {
  const navigate = useNavigate()

  const mainLink = {
    name: 'AEA Data and Code Repository',
    url: 'https://www.openicpsr.org/openicpsr/aea',
    description: 'Official repository for replication data and code of papers published in American Economic Review (AER) and other AEA journals. Free access to download materials and reproduce results.',
  }

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
            <h1 className="text-2xl font-bold text-gray-800">Paper Replication</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600 mb-6">
          Find official replication packages (data and code) for economics papers. Start with the main repository below.
        </p>

        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="border-l-4 border-orange-500 pl-4 py-3">
            <a
              href={mainLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-semibold text-lg block mb-1"
            >
              {mainLink.name} ↗
            </a>
            <p className="text-gray-600 text-sm">{mainLink.description}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PaperReplication
