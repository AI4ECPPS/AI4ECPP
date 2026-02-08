import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function OutsideLinks() {
  const navigate = useNavigate()

  const linkCategories = [
    {
      title: 'Research Organizations',
      links: [
        {
          name: 'NBER (National Bureau of Economic Research)',
          url: 'https://www.nber.org',
          description: 'Leading economics research organization with working papers and publications'
        },
        {
          name: 'CEPR (Centre for Economic Policy Research)',
          url: 'https://cepr.org',
          description: 'European network of economists conducting policy-relevant research'
        },
        {
          name: 'Brookings Institution',
          url: 'https://www.brookings.edu',
          description: 'Think tank conducting research on economics, public policy, and governance'
        },
        {
          name: 'Peterson Institute for International Economics',
          url: 'https://www.piie.com',
          description: 'Nonprofit research institution focused on international economics'
        }
      ]
    },
    {
      title: 'Academic Resources',
      links: [
        {
          name: 'Predoc.org',
          url: 'https://predoc.org',
          description: 'Resources and opportunities for predoctoral research positions'
        },
        {
          name: 'RePEc (Research Papers in Economics)',
          url: 'https://repec.org',
          description: 'Large collection of economics working papers and publications'
        },
        {
          name: 'SSRN (Social Science Research Network)',
          url: 'https://www.ssrn.com',
          description: 'Repository for preprints in economics and social sciences'
        },
        {
          name: 'EconLit',
          url: 'https://www.aeaweb.org/econlit',
          description: 'Comprehensive database of economics literature'
        }
      ]
    },
    {
      title: 'Data Sources',
      links: [
        {
          name: 'FRED (Federal Reserve Economic Data)',
          url: 'https://fred.stlouisfed.org',
          description: 'Economic data from the Federal Reserve Bank of St. Louis'
        },
        {
          name: 'World Bank Open Data',
          url: 'https://data.worldbank.org',
          description: 'Free and open access to global development data'
        },
        {
          name: 'IPUMS',
          url: 'https://ipums.org',
          description: 'Integrated public use microdata series for census and survey data'
        },
        {
          name: 'ICPSR',
          url: 'https://www.icpsr.umich.edu',
          description: 'Inter-university Consortium for Political and Social Research'
        }
      ]
    },
    {
      title: 'Job Boards & Opportunities',
      links: [
        {
          name: 'EconJobMarket',
          url: 'https://econjobmarket.org',
          description: 'Job market for economists in academia and research'
        },
        {
          name: 'AEA Job Openings for Economists (JOE)',
          url: 'https://www.aeaweb.org/joe',
          description: 'Official job board of the American Economic Association'
        },
        {
          name: 'Predoc.org Opportunities',
          url: 'https://predoc.org/opportunities',
          description: 'Predoctoral research assistant positions and opportunities'
        }
      ]
    },
    {
      title: 'Professional Organizations',
      links: [
        {
          name: 'American Economic Association (AEA)',
          url: 'https://www.aeaweb.org',
          description: 'Professional organization for economists'
        },
        {
          name: 'Society for Research Synthesis Methodology',
          url: 'https://www.srsm.org',
          description: 'Organization focused on meta-analysis and research synthesis'
        }
      ]
    }
  ]

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
            <h1 className="text-2xl font-bold text-gray-800">Outside Links</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Useful resources and links for economics and public policy research
          </p>
        </div>

        <div className="space-y-8">
          {linkCategories.map((category, categoryIdx) => (
            <div key={categoryIdx} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.links.map((link, linkIdx) => (
                  <div
                    key={linkIdx}
                    className="border-l-4 border-indigo-500 pl-4 py-3 hover:bg-gray-50 rounded-r-lg transition"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-lg block mb-1"
                    >
                      {link.name} ↗
                    </a>
                    <p className="text-gray-600 text-sm">{link.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default OutsideLinks

