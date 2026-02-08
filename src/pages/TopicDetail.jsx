import { useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import ReactMarkdown from 'react-markdown'

function TopicDetail() {
  const { topicId } = useParams()
  const navigate = useNavigate()

  // Topic data with descriptions and resources
  const topicData = {
    'urban': {
      title: 'Urban Policy & Urban Economics',
      icon: '🏙️',
      description: `Urban policy and urban economics examine how cities function, grow, and develop. This field combines insights from economics, public policy, and urban planning to address challenges like housing affordability, transportation systems, urban sprawl, and economic development in metropolitan areas.

Key areas of focus include:
- Housing markets and affordability
- Transportation and infrastructure
- Urban planning and zoning
- Economic development in cities
- Gentrification and neighborhood change
- Public services in urban areas`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'The Death and Life of Great American Cities', author: 'Jane Jacobs', description: 'Classic work on urban planning and city life' },
          { name: 'Urban Economics', author: 'Arthur O\'Sullivan', description: 'Comprehensive textbook on urban economics' },
          { name: 'The New Urban Crisis', author: 'Richard Florida', description: 'Analysis of contemporary urban challenges' },
        ],
        websites: [
          { name: 'Urban Institute', url: 'https://www.urban.org/', description: 'Research and policy analysis on urban issues' },
          { name: 'Brookings Metro', url: 'https://www.brookings.edu/program/metropolitan-policy-program/', description: 'Research on metropolitan policy and economics' },
          { name: 'Lincoln Institute of Land Policy', url: 'https://www.lincolninst.edu/', description: 'Research on land use and urban development' },
        ]
      }
    },
    'environment-energy': {
      title: 'Environment & Energy',
      icon: '🌱',
      description: `Environmental and energy economics addresses one of the most pressing challenges of our time: balancing economic growth with environmental sustainability. This field examines how markets, policies, and economic incentives can address climate change, promote renewable energy, protect natural resources, and manage environmental externalities.

Key areas of focus include:
- Climate change economics and carbon markets
- Renewable energy and energy transition
- Environmental regulation and pollution control
- Natural resource economics
- Environmental valuation and externalities
- Sustainability and green growth`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'Environmental and Natural Resource Economics', author: 'Tom Tietenberg & Lynne Lewis', description: 'Comprehensive textbook on environmental economics' },
          { name: 'The Economics of Climate Change', author: 'Nicholas Stern', description: 'Analysis of climate change economics' },
          { name: 'Energy and the Wealth of Nations', author: 'Charles A.S. Hall & Kent Klitgaard', description: 'Understanding energy economics' },
        ],
        websites: [
          { name: 'Resources for the Future', url: 'https://www.rff.org/', description: 'Research on environmental and energy economics' },
          { name: 'Environmental Defense Fund', url: 'https://www.edf.org/', description: 'Environmental policy and economics research' },
          { name: 'International Energy Agency', url: 'https://www.iea.org/', description: 'Energy policy and statistics' },
        ]
      }
    },
    'healthcare': {
      title: 'Healthcare & Health Economics',
      icon: '🏥',
      description: `Healthcare and health economics examine how healthcare systems are organized, financed, and delivered. This field addresses critical questions about access to care, healthcare costs, quality of care, health insurance markets, and the role of government in healthcare.

Key areas of focus include:
- Healthcare system organization and financing
- Health insurance markets and economics
- Healthcare costs and cost-effectiveness analysis
- Public health and prevention
- Health outcomes and quality of care
- Pharmaceutical economics and policy`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'Health Economics', author: 'Jay Bhattacharya, Timothy Hyde, & Peter Tu', description: 'Comprehensive textbook on health economics' },
          { name: 'The Economics of Health and Health Care', author: 'Sherman Folland, Allen C. Goodman, & Miron Stano', description: 'Textbook on healthcare economics' },
          { name: 'An American Sickness', author: 'Elisabeth Rosenthal', description: 'Analysis of the American healthcare system' },
        ],
        websites: [
          { name: 'Kaiser Family Foundation', url: 'https://www.kff.org/', description: 'Healthcare policy research and analysis' },
          { name: 'Commonwealth Fund', url: 'https://www.commonwealthfund.org/', description: 'Healthcare system research' },
          { name: 'National Bureau of Economic Research - Health', url: 'https://www.nber.org/programs-projects/programs-working-groups/health-economics', description: 'Health economics research papers' },
        ]
      }
    },
    'education': {
      title: 'Education & Education Economics',
      icon: '📚',
      description: `Education and education economics examine how educational systems affect student outcomes, economic mobility, and human capital development. This field addresses questions about school choice, teacher quality, education financing, human capital theory, and the returns to education.

Key areas of focus include:
- Human capital theory
- School choice and competition
- Teacher labor markets and effectiveness
- Education financing and equity
- Returns to education
- Early childhood and higher education economics`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'The Economics of Education', author: 'Steve Bradley & Colin Green', description: 'Comprehensive textbook on education economics' },
          { name: 'The Race Between Education and Technology', author: 'Claudia Goldin & Lawrence Katz', description: 'Analysis of education and economic growth' },
          { name: 'The Teacher Wars', author: 'Dana Goldstein', description: 'History of education policy in America' },
        ],
        websites: [
          { name: 'Brookings Center on Education Data', url: 'https://www.brookings.edu/center/center-on-education-data-and-policy/', description: 'Education policy research' },
          { name: 'Education Next', url: 'https://www.educationnext.org/', description: 'Education policy journal and research' },
          { name: 'National Center for Education Statistics', url: 'https://nces.ed.gov/', description: 'Education data and statistics' },
        ]
      }
    },
    'development': {
      title: 'Development & Development Economics',
      icon: '🌍',
      description: `Development and development economics examine how to promote economic growth, reduce poverty, and improve living standards in developing countries. This field addresses questions about aid effectiveness, institutions, trade, markets, and the role of policy in development.

Key areas of focus include:
- Economic growth and development theories
- Poverty reduction and inequality
- Institutions and governance
- International trade and development
- Development finance and microfinance
- Experimental development economics`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'Poor Economics', author: 'Abhijit Banerjee & Esther Duflo', description: 'Nobel Prize-winning analysis of poverty and development' },
          { name: 'The Bottom Billion', author: 'Paul Collier', description: 'Analysis of the world\'s poorest countries' },
          { name: 'Development Economics', author: 'Debraj Ray', description: 'Comprehensive textbook on development economics' },
        ],
        websites: [
          { name: 'World Bank Research', url: 'https://www.worldbank.org/en/research', description: 'Development economics research' },
          { name: 'Center for Global Development', url: 'https://www.cgdev.org/', description: 'Research on global development policy' },
          { name: 'J-PAL', url: 'https://www.povertyactionlab.org/', description: 'Poverty Action Lab - development research' },
        ]
      }
    },
    'global-conflicts': {
      title: 'Global Conflicts & Conflict Economics',
      icon: '🕊️',
      description: `Global conflicts and conflict economics examine the economic causes and consequences of war, conflict, and peace. This field addresses questions about the economic drivers of conflict, the costs of war, post-conflict reconstruction, and the economics of peacebuilding.

Key areas of focus include:
- Economic causes of conflict and war
- Costs of conflict and war
- Post-conflict reconstruction and development
- Economics of peacebuilding
- International relations and trade during conflicts
- Resource conflicts and natural resource economics`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'The Economics of War', author: 'Paul Poast', description: 'Analysis of the economic aspects of war and conflict' },
          { name: 'Why Nations Fail', author: 'Daron Acemoglu & James Robinson', description: 'Analysis of institutions, conflict, and economic development' },
          { name: 'The Bottom Billion', author: 'Paul Collier', description: 'Analysis of conflict and development in the world\'s poorest countries' },
        ],
        websites: [
          { name: 'World Bank - Fragility, Conflict and Violence', url: 'https://www.worldbank.org/en/topic/fragilityconflictviolence', description: 'Research on conflict and development' },
          { name: 'International Crisis Group', url: 'https://www.crisisgroup.org/', description: 'Analysis of global conflicts and crises' },
          { name: 'Stockholm International Peace Research Institute', url: 'https://www.sipri.org/', description: 'Research on peace and conflict' },
        ]
      }
    },
    'finance': {
      title: 'Finance & Financial Economics',
      icon: '💰',
      description: `Finance and financial economics examine how financial markets function, how assets are priced, and how financial institutions operate. This field addresses questions about banking, monetary policy, financial regulation, and the role of finance in the economy.

Key areas of focus include:
- Financial markets and asset pricing
- Banking and financial institutions
- Monetary policy and central banking
- Financial regulation and stability
- Corporate finance
- International finance and exchange rates`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'Principles of Corporate Finance', author: 'Richard Brealey, Stewart Myers, & Franklin Allen', description: 'Comprehensive textbook on corporate finance' },
          { name: 'The Economics of Money, Banking and Financial Markets', author: 'Frederic Mishkin', description: 'Textbook on money, banking, and financial markets' },
          { name: 'Lords of Finance', author: 'Liaquat Ahamed', description: 'History of central banking and the Great Depression' },
        ],
        websites: [
          { name: 'Federal Reserve Economic Data (FRED)', url: 'https://fred.stlouisfed.org/', description: 'Economic and financial data' },
          { name: 'National Bureau of Economic Research - Finance', url: 'https://www.nber.org/programs-projects/programs-working-groups/corporate-finance', description: 'Financial economics research papers' },
          { name: 'International Monetary Fund', url: 'https://www.imf.org/', description: 'Research on international finance and monetary policy' },
        ]
      }
    },
    'inequality': {
      title: 'Inequality & Distributional Economics',
      icon: '⚖️',
      description: `Inequality and distributional economics examine how income, wealth, and opportunities are distributed across individuals and groups. This field addresses questions about the causes and consequences of inequality, social mobility, and policies to address inequality.

Key areas of focus include:
- Income and wealth inequality
- Social mobility and intergenerational transmission
- Causes of inequality (education, technology, globalization)
- Consequences of inequality
- Policies to reduce inequality
- Gender and racial inequality`,
      resources: {
        courses: [],
        videos: [],
        books: [
          { name: 'Capital in the Twenty-First Century', author: 'Thomas Piketty', description: 'Analysis of wealth and income inequality' },
          { name: 'The Great Leveler', author: 'Walter Scheidel', description: 'History of inequality and violence' },
          { name: 'The Price of Inequality', author: 'Joseph Stiglitz', description: 'Analysis of inequality and its consequences' },
        ],
        websites: [
          { name: 'World Inequality Database', url: 'https://wid.world/', description: 'Data and research on global inequality' },
          { name: 'Economic Policy Institute', url: 'https://www.epi.org/', description: 'Research on inequality and economic policy' },
          { name: 'Institute for Research on Poverty', url: 'https://www.irp.wisc.edu/', description: 'Research on poverty and inequality' },
          { name: 'Stone Center for Research on Wealth Inequality and Mobility - UChicago', url: 'https://stonecenter.uchicago.edu/', description: 'Research on wealth inequality and mobility at the University of Chicago' },
        ]
      }
    },
  }

  const topic = topicData[topicId]

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Topic not found</h1>
          <button
            onClick={() => navigate('/topics')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Topics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/topics')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Topics
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">{topic.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Topic Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{topic.icon}</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{topic.title}</h2>
            </div>
          </div>
          <div className="prose max-w-none text-gray-700">
            <ReactMarkdown>{topic.description}</ReactMarkdown>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-6">
          {/* Courses - section header retained, content removed */}
          {topic.resources.courses && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📖</span> Online Courses & Learning Resources
              </h3>
              <div className="space-y-4">
                {topic.resources.courses.map((course, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {course.name}
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos - section header retained, content removed */}
          {topic.resources.videos && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🎥</span> Videos & Lectures
              </h3>
              <div className="space-y-4">
                {topic.resources.videos.map((video, index) => (
                  <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-red-600 hover:text-red-700 hover:underline"
                    >
                      {video.name}
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{video.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Books */}
          {topic.resources.books && topic.resources.books.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📚</span> Recommended Books
              </h3>
              <div className="space-y-4">
                {topic.resources.books.map((book, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="text-lg font-semibold text-gray-800">{book.name}</div>
                    <div className="text-gray-600 text-sm mt-1">by {book.author}</div>
                    <p className="text-gray-600 text-sm mt-1">{book.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Websites */}
          {topic.resources.websites && topic.resources.websites.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🔗</span> Research Organizations & Websites
              </h3>
              <div className="space-y-4">
                {topic.resources.websites.map((website, index) => (
                  <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                    >
                      {website.name}
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{website.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default TopicDetail

