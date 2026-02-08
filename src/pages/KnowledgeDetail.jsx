import { useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import ReactMarkdown from 'react-markdown'

function KnowledgeDetail() {
  const { topicId } = useParams()
  const navigate = useNavigate()

  // Knowledge topic data organized like a course syllabus
  const knowledgeData = {
    'microeconomics': {
      title: 'Microeconomics',
      icon: '📊',
      overview: 'Microeconomics studies how individuals and firms make decisions and how they interact in markets. This course covers consumer choice, firm behavior, market structures, and welfare analysis.',
      modules: [
        {
          title: 'Consumer Theory',
          topics: [
            'Utility maximization and budget constraints',
            'Demand functions and elasticity',
            'Income and substitution effects'
          ]
        },
        {
          title: 'Producer Theory',
          topics: [
            'Production functions and cost minimization',
            'Profit maximization and supply curves',
            'Returns to scale and long-run costs'
          ]
        },
        {
          title: 'Market Structures',
          topics: [
            'Perfect competition and efficiency',
            'Monopoly and market power',
            'Oligopoly and strategic behavior'
          ]
        },
        {
          title: 'Welfare Economics',
          topics: [
            'Consumer and producer surplus',
            'Pareto efficiency and welfare theorems',
            'Market failures and government intervention'
          ]
        }
      ],
      videos: [
        {
          title: 'Microeconomics - Selcuk Ozyurt',
          url: 'https://www.youtube.com/@selcukozyurt',
          description: 'Comprehensive microeconomics course by Selcuk Ozyurt covering consumer theory, producer theory, and market structures'
        }
      ]
    },
    'econometrics': {
      title: 'Econometrics',
      icon: '📈',
      overview: 'Econometrics applies statistical methods to economic data for testing theories, estimating relationships, and making causal inferences. Essential for empirical research.',
      modules: [
        {
          title: 'Regression Fundamentals',
          topics: [
            'Ordinary Least Squares (OLS) estimation',
            'Gauss-Markov Theorem and BLUE properties',
            'Hypothesis testing and confidence intervals'
          ]
        },
        {
          title: 'Causal Inference',
          topics: [
            'Randomized Controlled Trials (RCTs)',
            'Instrumental Variables (IV)',
            'Difference-in-Differences (DID)',
            'Regression Discontinuity (RD)'
          ]
        },
        {
          title: 'Panel Data',
          topics: [
            'Fixed effects and random effects models',
            'First differences estimation',
            'Balanced vs. unbalanced panels'
          ]
        },
        {
          title: 'Time Series Basics',
          topics: [
            'Stationarity and unit root tests',
            'ARIMA models',
            'Cointegration and error correction'
          ]
        }
      ],
      videos: []
    },
    'game-theory': {
      title: 'Game Theory',
      icon: '🎲',
      overview: 'Game theory studies strategic interactions among rational decision-makers. It provides tools for analyzing competition, cooperation, and strategic behavior.',
      modules: [
        {
          title: 'Basic Concepts',
          topics: [
            'Normal form and extensive form games',
            'Dominant strategies and iterated elimination',
            'Nash equilibrium'
          ]
        },
        {
          title: 'Solution Concepts',
          topics: [
            'Pure and mixed strategy equilibria',
            'Subgame perfect equilibrium',
            'Bayesian Nash equilibrium'
          ]
        },
        {
          title: 'Classic Games',
          topics: [
            'Prisoner\'s Dilemma and cooperation',
            'Battle of the Sexes (coordination)',
            'Chicken Game (brinkmanship)'
          ]
        },
        {
          title: 'Applications',
          topics: [
            'Oligopoly: Cournot and Bertrand competition',
            'Auctions: First-price and second-price',
            'Signaling and screening models'
          ]
        }
      ],
      videos: []
    },
    'data-analysis': {
      title: 'Data Analysis',
      icon: '💾',
      overview: 'Data analysis involves collecting, cleaning, transforming, and interpreting data to extract meaningful insights. Essential for empirical research.',
      modules: [
        {
          title: 'Data Management',
          topics: [
            'Data types: cross-sectional, time series, panel',
            'Data cleaning and missing values',
            'Data merging and reshaping'
          ]
        },
        {
          title: 'Descriptive Statistics',
          topics: [
            'Measures of central tendency and dispersion',
            'Distribution shapes and outliers',
            'Correlation analysis'
          ]
        },
        {
          title: 'Data Visualization',
          topics: [
            'Univariate and bivariate plots',
            'Principles of effective visualization',
            'Tools: ggplot2, matplotlib, Tableau'
          ]
        },
        {
          title: 'Statistical Inference',
          topics: [
            'Hypothesis testing and p-values',
            'Confidence intervals',
            'ANOVA and non-parametric tests'
          ]
        }
      ],
      keyTools: [
        'R: dplyr, ggplot2 for data manipulation and visualization',
        'Python: pandas, numpy for data analysis',
        'Stata: Econometric analysis and panel data',
        'SQL: Database queries and data extraction'
      ],
      videos: [
        {
          title: 'Data Analysis with Python - freeCodeCamp',
          url: 'https://www.youtube.com/@freecodecamp',
          description: 'Comprehensive Python data analysis course covering pandas, numpy, and visualization'
        },
        {
          title: 'R Programming - StatQuest',
          url: 'https://www.youtube.com/@statquest',
          description: 'Clear explanations of R programming, statistics, and data visualization by Josh Starmer'
        }
      ]
    },
    'industrial-organization': {
      title: 'Industrial Organization',
      icon: '🏭',
      overview: 'Industrial Organization studies how firms compete in markets, how market structure affects behavior, and how government policies influence outcomes.',
      modules: [
        {
          title: 'Market Structure',
          topics: [
            'Market concentration (HHI) and barriers to entry',
            'Product differentiation',
            'Network effects and two-sided markets'
          ]
        },
        {
          title: 'Pricing Strategies',
          topics: [
            'Price discrimination (first, second, third degree)',
            'Bundling and tying',
            'Dynamic pricing'
          ]
        },
        {
          title: 'Competition Models',
          topics: [
            'Cournot (quantity) competition',
            'Bertrand (price) competition',
            'Stackelberg (leader-follower) model'
          ]
        },
        {
          title: 'Market Power and Welfare',
          topics: [
            'Lerner Index: Measuring market power',
            'Deadweight loss from market power',
            'Consumer and producer surplus'
          ]
        }
      ],
      videos: []
    },
    'gis': {
      title: 'GIS (Geographic Information Systems)',
      icon: '🗺️',
      overview: 'GIS combines geographic data with analytical tools to visualize, analyze, and interpret spatial relationships. Essential for location-based research.',
      modules: [
        {
          title: 'Spatial Data Fundamentals',
          topics: [
            'Vector vs. raster data',
            'Coordinate systems and map projections',
            'Spatial reference systems (WGS84, UTM)'
          ]
        },
        {
          title: 'Spatial Analysis',
          topics: [
            'Spatial joins and overlay operations',
            'Buffer analysis and proximity',
            'Network analysis and accessibility'
          ]
        },
        {
          title: 'Spatial Statistics',
          topics: [
            'Spatial autocorrelation (Moran\'s I)',
            'Spatial regression models',
            'Geographically Weighted Regression (GWR)'
          ]
        },
        {
          title: 'Applications in Economics',
          topics: [
            'Housing markets and property values',
            'Transportation and accessibility',
            'Environmental economics and pollution exposure'
          ]
        }
      ],
      videos: [
        {
          title: 'QGIS Tutorial - Klas Karlsson',
          url: 'https://www.youtube.com/@KlasKarlsson',
          description: 'Comprehensive QGIS tutorials for beginners and advanced users by Klas Karlsson'
        },
        {
          title: 'GIS Tutorial - Spatial Thoughts',
          url: 'https://www.youtube.com/@SpatialThoughts',
          description: 'Spatial analysis techniques and GIS applications in research'
        }
      ]
    },
  }

  const topic = knowledgeData[topicId]

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/knowledge')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Knowledge Base
              </button>
              <Logo className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-800">Topic Not Found</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">The requested knowledge topic could not be found.</p>
            <button
              onClick={() => navigate('/knowledge')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Return to Knowledge Base
            </button>
          </div>
        </main>
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
              onClick={() => navigate('/knowledge')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Knowledge Base
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">{topic.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{topic.icon}</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{topic.title}</h2>
            </div>
          </div>
          <p className="text-gray-700 text-lg leading-relaxed">{topic.overview}</p>
        </div>

        {/* Course Modules */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Course Modules</h3>
          <div className="space-y-6">
            {topic.modules.map((module, idx) => (
              <div key={idx} className="border-l-4 border-indigo-500 pl-4">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">
                  Module {idx + 1}: {module.title}
                </h4>
                <ul className="space-y-2 ml-4">
                  {module.topics.map((topicItem, topicIdx) => (
                    <li key={topicIdx} className="text-gray-700 flex items-start">
                      <span className="text-indigo-600 mr-2">•</span>
                      <span>{topicItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Videos */}
        {topic.videos && topic.videos.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Recommended Videos</h3>
            <div className="space-y-4">
              {topic.videos.map((video, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-indigo-500 pl-4 py-3 hover:bg-gray-50 rounded-r-lg transition"
                >
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold text-lg block mb-1"
                  >
                    {video.title} ↗
                  </a>
                  <p className="text-gray-600 text-sm">{video.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Tools (only for Data Analysis) */}
        {topic.keyTools && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Key Tools</h3>
            <ul className="space-y-3">
              {topic.keyTools.map((item, idx) => (
                <li key={idx} className="text-gray-700 flex items-start">
                  <span className="text-indigo-600 mr-2 font-bold">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

export default KnowledgeDetail
