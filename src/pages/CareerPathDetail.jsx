import { useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function CareerPathDetail() {
  const { pathId } = useParams()
  const navigate = useNavigate()

  const careerPathData = {
    'government': {
      title: 'Government & Public Sector',
      icon: '🏛️',
      overview: 'Working in government and public sector offers opportunities to directly shape and implement public policy. This career path allows you to work on policy design, implementation, and evaluation at various levels of government.',
      careerOpportunities: [
        {
          category: 'Federal Government',
          roles: [
            { title: 'Policy Analyst', description: 'Analyze policy proposals, conduct research, and provide recommendations to policymakers' },
            { title: 'Program Manager', description: 'Oversee government programs, manage budgets, and ensure program effectiveness' },
            { title: 'Economist', description: 'Conduct economic analysis for federal agencies (e.g., CBO, Federal Reserve, Treasury)' },
            { title: 'Legislative Staff', description: 'Work for members of Congress on policy development and analysis' },
          ]
        },
        {
          category: 'State & Local Government',
          roles: [
            { title: 'State Policy Analyst', description: 'Develop and analyze state-level policies' },
            { title: 'City Planner', description: 'Work on urban development, housing, and transportation policies' },
            { title: 'Budget Analyst', description: 'Manage public budgets and financial planning' },
            { title: 'Public Health Official', description: 'Implement health policies and programs' },
          ]
        }
      ],
      skillsNeeded: [
        'Strong analytical and quantitative skills',
        'Understanding of policy processes and government structures',
        'Communication skills for working with stakeholders',
        'Ability to work in bureaucratic environments'
      ],
      entryPoints: [
        'Federal internships and fellowships (Presidential Management Fellowship, etc.)',
        'State and local government internships',
        'Entry-level analyst positions',
        'Graduate programs in public policy or public administration'
      ]
    },
    'nonprofit-international': {
      title: 'Nonprofit, NGO & International Organizations',
      icon: '🌐',
      overview: 'Nonprofit organizations, NGOs, and international organizations work on a wide range of social, economic, and global policy issues. This path offers opportunities to work on causes you care about while applying policy analysis skills at both domestic and international levels.',
      careerOpportunities: [
        {
          category: 'International Organizations',
          roles: [
            { title: 'World Bank', description: 'Development economics, project management, policy analysis' },
            { title: 'IMF', description: 'Economic analysis, financial stability, policy advice' },
            { title: 'UN Agencies', description: 'Policy development, program management, research' },
            { title: 'OECD', description: 'Policy research and analysis on economic and social issues' },
            { title: 'Regional Development Banks', description: 'Project management and policy analysis' },
          ]
        },
        {
          category: 'International NGOs',
          roles: [
            { title: 'Program Manager', description: 'Design and implement development programs' },
            { title: 'Policy Advocate', description: 'Advocate for policy changes at national and international levels' },
            { title: 'Research Analyst', description: 'Conduct research on development, poverty, and social issues' },
            { title: 'Grant Writer', description: 'Secure funding for programs and initiatives' },
          ]
        },
        {
          category: 'Domestic Nonprofits',
          roles: [
            { title: 'Policy Director', description: 'Lead policy initiatives and advocacy efforts' },
            { title: 'Program Evaluator', description: 'Assess program effectiveness and impact' },
            { title: 'Community Organizer', description: 'Work with communities to address local issues' },
            { title: 'Development Officer', description: 'Fundraise and manage donor relationships' },
          ]
        }
      ],
      skillsNeeded: [
        'Passion for social causes and mission-driven work',
        'Grant writing and fundraising skills',
        'Program management and evaluation',
        'Strong communication and advocacy skills',
        'Language skills (often multiple languages for international roles)',
        'Understanding of international relations',
        'Cultural sensitivity and adaptability'
      ],
      entryPoints: [
        'Internships at nonprofits and international organizations',
        'Volunteer positions',
        'Entry-level program coordinator roles',
        'Fellowships (e.g., AmeriCorps, Teach for America)',
        'Young Professional Programs (e.g., World Bank YPP)',
        'Graduate programs with international focus',
        'Entry-level positions in international development'
      ]
    },
    'consulting-private': {
      title: 'Consulting & Private Sector',
      icon: '💼',
      overview: 'Policy consulting firms and private sector companies offer opportunities to apply policy analysis skills in business and consulting environments. This path includes working with governments, nonprofits, and corporate clients to solve complex policy problems, as well as applying policy skills within corporate settings.',
      careerOpportunities: [
        {
          category: 'Policy Consulting',
          roles: [
            { title: 'Economic Consultant', description: 'Provide economic analysis for policy decisions' },
            { title: 'Policy Analyst', description: 'Analyze policy impacts and provide recommendations' },
            { title: 'Research Associate', description: 'Conduct research and data analysis' },
            { title: 'Project Manager', description: 'Manage consulting projects and client relationships' },
            { title: 'Public Sector Consultant', description: 'Help governments improve efficiency and effectiveness' },
            { title: 'Strategy Consultant', description: 'Develop strategic plans for public organizations' },
          ]
        },
        {
          category: 'Private Sector',
          roles: [
            { title: 'Government Relations Manager', description: 'Manage relationships with government stakeholders' },
            { title: 'Policy Analyst', description: 'Analyze how policies affect the company' },
            { title: 'Regulatory Affairs Specialist', description: 'Navigate regulatory requirements' },
            { title: 'Corporate Social Responsibility Manager', description: 'Develop and implement CSR programs' },
            { title: 'Financial Services Policy Analyst', description: 'Analyze financial regulations and policies' },
            { title: 'Tech Policy Analyst', description: 'Work on technology policy issues' },
          ]
        }
      ],
      skillsNeeded: [
        'Strong analytical and quantitative skills',
        'Problem-solving abilities',
        'Client management and communication',
        'Ability to work on multiple projects simultaneously',
        'Understanding of business and corporate environments',
        'Policy analysis and regulatory knowledge',
        'Ability to translate policy into business implications'
      ],
      entryPoints: [
        'Consulting firm internships',
        'Corporate internships',
        'Entry-level analyst positions',
        'Graduate programs in public policy, economics, or business',
        'Predoc positions at research organizations',
        'Rotational programs'
      ]
    },
    'research': {
      title: 'Research & Think Tanks',
      icon: '🔬',
      overview: 'Think tanks and research institutions conduct policy research and analysis. This path is ideal for those who enjoy research and want to influence policy through evidence-based analysis.',
      careerOpportunities: [
        {
          category: 'Think Tanks',
          roles: [
            { title: 'Policy Researcher', description: 'Conduct research on policy issues' },
            { title: 'Research Associate', description: 'Support senior researchers and conduct analysis' },
            { title: 'Policy Fellow', description: 'Lead research projects and publish findings' },
            { title: 'Communications Manager', description: 'Translate research findings for policymakers and the public' },
          ]
        },
        {
          category: 'Academic Research',
          roles: [
            { title: 'Research Assistant', description: 'Support academic research projects' },
            { title: 'Predoc Researcher', description: 'Work as a predoctoral research assistant' },
            { title: 'Postdoc Researcher', description: 'Conduct independent research after PhD' },
            { title: 'Research Director', description: 'Lead research programs and teams' },
          ]
        }
      ],
      skillsNeeded: [
        'Strong research and analytical skills',
        'Quantitative methods and econometrics',
        'Writing and communication skills',
        'Ability to work independently'
      ],
      entryPoints: [
        'Research assistant positions',
        'Predoc programs',
        'Think tank internships',
        'Graduate programs (Master\'s or PhD)'
      ]
    },
  }

  const path = careerPathData[pathId]

  if (!path) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/career-path')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Career Path
              </button>
              <Logo className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-800">Career Path Not Found</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">The requested career path could not be found.</p>
            <button
              onClick={() => navigate('/career-path')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Return to Career Path
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
              onClick={() => navigate('/career-path')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Career Path
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">{path.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{path.icon}</span>
            <h2 className="text-3xl font-bold text-gray-800">{path.title}</h2>
          </div>
          <p className="text-gray-700 text-lg leading-relaxed">{path.overview}</p>
        </div>

        {/* Career Opportunities Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Career Opportunities</h3>
          <div className="space-y-6">
            {path.careerOpportunities.map((category, idx) => (
              <div key={idx} className="border-l-4 border-indigo-500 pl-4">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">{category.category}</h4>
                <div className="space-y-3">
                  {category.roles.map((role, roleIdx) => (
                    <div key={roleIdx} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                      <h5 className="font-semibold text-gray-800 mb-1">{role.title}</h5>
                      <p className="text-gray-600 text-sm">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Needed Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Skills Needed</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {path.skillsNeeded.map((skill, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span className="text-gray-700">{skill}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Points Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Entry Points</h3>
          <div className="space-y-2">
            {path.entryPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">→</span>
                <span className="text-gray-700">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CareerPathDetail

