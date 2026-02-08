import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function OfferGenerator() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [offerType, setOfferType] = useState('academic') // 'academic' or 'industry'
  const [academicPosition, setAcademicPosition] = useState('phd') // 'phd', 'professor', 'researchAssistant'
  const [industryPosition, setIndustryPosition] = useState('consultant') // 'consultant', 'analyst', 'researcher', 'ngo'
  const [additionalDescription, setAdditionalDescription] = useState('')
  const [generatedOffer, setGeneratedOffer] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleNameChange = (e) => {
    const value = limitInputLength(e.target.value, 100)
    setName(value)
  }

  const handleDescriptionChange = (e) => {
    const value = limitInputLength(e.target.value, 1000)
    setAdditionalDescription(value)
  }

  const handleGenerate = async () => {
    // 验证输入 - 拒绝包含脏话的输入
    const validation = validateAndSanitizeText(name, {
      maxLength: 100,
      minLength: 1,
      required: true,
      filterProfanity: false // 直接拒绝脏话而不是过滤
    })

    if (!validation.valid) {
      alert(validation.message || 'Please check your input')
      return
    }

    if (!name.trim()) {
      alert('Please enter your name')
      return
    }

    setLoading(true)
    try {
      // 使用清理后的输入
      const cleanedName = validation.cleaned
      
      // 验证可选的描述输入
      // 注意：用户描述文本不需要进行SQL注入和XSS检测，因为：
      // 1. 这些文本会被发送到ChatGPT API，不会直接进入数据库
      // 2. 正常文本可能包含单引号（如 "I'm"）等字符，这些是合法的
      // 3. 只需要检查长度和脏话即可
      let cleanedDescription = ''
      if (additionalDescription.trim()) {
        const descValidation = validateAndSanitizeText(additionalDescription, {
          maxLength: 1000,
          minLength: 0,
          required: false,
          filterProfanity: false,
          checkSQLInjection: false, // 不检查SQL注入
          checkXSS: false // 不检查XSS
        })
        if (!descValidation.valid) {
          alert(descValidation.message || 'Please check your additional description')
          setLoading(false)
          return
        }
        cleanedDescription = descValidation.cleaned
      }

      // 确定职位类型和描述
      let positionType = ''
      let positionDetails = ''
      let offerContext = ''
      
      if (offerType === 'academic') {
        if (academicPosition === 'phd') {
          positionType = 'PhD program admission'
          positionDetails = 'Economics PhD program'
          offerContext = 'PhD program admission offer letter'
        } else if (academicPosition === 'professor') {
          positionType = 'Professor position'
          positionDetails = 'Professor position (Assistant Professor, Associate Professor, or Full Professor) in Economics'
          offerContext = 'Professor position offer letter'
        } else if (academicPosition === 'researchAssistant') {
          positionType = 'Research Assistant position'
          positionDetails = 'Research Assistant position in Economics'
          offerContext = 'Research Assistant position offer letter'
        }
      } else {
        if (industryPosition === 'consultant') {
          positionType = 'Consultant position'
          positionDetails = 'Economic Consultant (or similar consulting role)'
          offerContext = 'Consulting position offer letter'
        } else if (industryPosition === 'analyst') {
          positionType = 'Analyst position'
          positionDetails = 'Economic Analyst (or similar analyst role)'
          offerContext = 'Analyst position offer letter'
        } else if (industryPosition === 'researcher') {
          positionType = 'Researcher position'
          positionDetails = 'Economic Researcher (or similar research role)'
          offerContext = 'Research position offer letter'
        } else if (industryPosition === 'ngo') {
          positionType = 'NGO position'
          positionDetails = 'NGO position (e.g., Policy Analyst, Program Manager, Research Associate) in an international or domestic NGO focused on economic development, public policy, or social impact'
          offerContext = 'NGO position offer letter'
        }
      }

      // 获取当前日期
      const today = new Date()
      const currentDate = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth() + 1 // 0-indexed, so add 1
      
      // 构建 prompt
      let prompt = `Generate a realistic-looking ${offerContext} for ${cleanedName} for a ${positionDetails}. 

IMPORTANT REQUIREMENTS:
1. Make it look like a REAL, PROFESSIONAL offer letter with formal structure
2. ${offerType === 'academic' 
  ? 'Use a fictional university name (DO NOT use any real university names like Harvard, MIT, Stanford, Yale, Princeton, Columbia, Chicago, Berkeley, etc.)'
  : industryPosition === 'ngo'
  ? 'Use a fictional NGO name (DO NOT use any real NGO names like World Bank, IMF, Oxfam, Save the Children, etc.)'
  : 'Use a fictional company name (DO NOT use any real company names like McKinsey, BCG, Deloitte, PwC, etc.)'}
3. Include typical elements of a real ${offerType === 'academic' ? 'academic' : 'industry'} offer:
   - Formal letterhead with fictional ${offerType === 'academic' ? 'university' : industryPosition === 'ngo' ? 'NGO' : 'company'} name
   - Date: Use today's date (${currentDate}) or a date in the near future (within the next few weeks). DO NOT use any past dates. The letter date should be current or recent.
   - Formal greeting
   - Congratulations message
   - ${offerType === 'academic' 
     ? academicPosition === 'phd' 
       ? `Program details (Economics PhD program), Funding information (stipend, tuition waiver, etc.), Start date (Fall ${currentYear} or Fall ${currentYear + 1} - use a future date)`
       : academicPosition === 'professor'
       ? `Position details (Professor position in Economics - can be Assistant, Associate, or Full Professor), Salary/compensation, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Teaching and research expectations, Department and university context`
       : `Position details (Research Assistant position in Economics), Salary/stipend, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Research responsibilities, Supervisor information, Project details`
     : industryPosition === 'consultant'
     ? `Position details (Economic Consultant role), Salary/compensation, Benefits, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Client work expectations`
     : industryPosition === 'analyst'
     ? `Position details (Economic Analyst role), Salary/compensation, Benefits, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Analysis and reporting responsibilities`
     : industryPosition === 'researcher'
     ? `Position details (Economic Researcher role), Salary/compensation, Benefits, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Research responsibilities`
     : `Position details (NGO role - e.g., Policy Analyst, Program Manager, Research Associate), Salary/compensation, Benefits, Start date (use a date in ${currentYear} or ${currentYear + 1}, not in the past), Mission and program responsibilities, Impact and development focus`}
   - Deadline for response: Use a date in the future (at least 2-4 weeks from the letter date). DO NOT use any past dates.
   - Contact information
   - Formal closing with signature line
4. Add more humor and wit throughout the letter (but keep it balanced - not too much):
   - Include multiple economics-related jokes, puns, and clever wordplay (e.g., "We're confident you'll find this position to be a great investment with excellent returns", "Your skills are in high demand, and we're excited to supply you with this opportunity", "We've calculated the opportunity cost of not hiring you, and it's simply too high")
   - Add playful ${offerType === 'academic' ? 'academic' : 'business'} references and light-hearted comments
   - Include funny but encouraging comments about the ${offerType === 'academic' ? 'academic' : 'professional'} journey (e.g., "We promise the only thing that will be regressing is your stress levels", "You'll have access to our coffee supply - which, we assure you, has a very elastic demand")
   - Use clever wordplay related to economics terms throughout (supply/demand, opportunity cost, market value, elasticity, externalities, etc.)
   - Add humorous details in funding/compensation sections (e.g., "Your stipend includes a generous coffee budget - because we know the correlation between caffeine and productivity is... well, let's just say it's significant")
   - Include a few light jokes about the field or position itself
   - Keep the humor clever, witty, and appropriate - it should make the letter more entertaining while still maintaining professionalism
5. Balance professionalism with warmth and humor - the letter should feel genuine, encouraging, and playfully funny (but not silly or unprofessional)
6. Use proper ${offerType === 'academic' ? 'academic' : 'business'} language and formatting while naturally weaving in humorous elements throughout the letter`

      if (cleanedDescription) {
        prompt += `\n\nAdditional requirements from the user:\n${cleanedDescription}\n\nPlease incorporate these requirements into the offer letter while maintaining the professional and realistic tone.`
      }

      prompt += `\n\nAt the end of the letter, add a clear disclaimer: "DISCLAIMER: This is a fictional offer letter generated for motivational purposes only. This is not a real admission offer from any university."`

      const systemMessage = offerType === 'academic'
        ? `You are a professional academic administrator with a warm, witty, and humorous personality who writes formal ${academicPosition === 'phd' ? 'PhD admission' : academicPosition === 'professor' ? 'Professor position' : 'Research Assistant position'} offer letters. Generate a realistic-looking offer letter that follows standard academic letter formatting. Use a completely fictional university name (e.g., "Northwood University", "Riverside Institute", "Valley State University" - but create a unique name). DO NOT use any real university names.

The letter should be:
- Professional and formal in structure
- Encouraging and supportive
- Playfully humorous with multiple economics-related jokes, puns, and clever wordplay throughout
- Warm and personable while maintaining academic professionalism
- Include several clever references to economics concepts (supply/demand, opportunity cost, returns, elasticity, externalities, etc.) in a funny way
- Add humor to various sections (funding, expectations, benefits, etc.)

The humor should be:
- More prominent and witty (but still appropriate for an academic context)
- Economics-themed, clever, and genuinely funny
- Integrated naturally throughout the letter (not just at the end)
- Make the reader smile and laugh while still feeling the letter is professional
- Examples: "We've run the numbers, and hiring you has a positive expected value", "Your stipend includes unlimited coffee - we've found the price elasticity of demand for caffeine among our students is... well, let's just say it's inelastic", "We promise the only thing that will be regressing is your stress levels"`
        : `You are a professional HR manager or recruiter with a warm, witty, and humorous personality who writes formal ${industryPosition} offer letters for economic consulting firms or companies. Generate a realistic-looking offer letter that follows standard business letter formatting. Use a completely fictional company name (e.g., "Strategic Economics Group", "Global Analytics Partners", "Economic Insights Consulting" - but create a unique name). DO NOT use any real company names like McKinsey, BCG, Deloitte, etc.

The letter should be:
- Professional and formal in structure
- Encouraging and supportive
- Playfully humorous with multiple economics-related jokes, puns, and clever wordplay throughout
- Warm and personable while maintaining business professionalism
- Include several clever references to economics concepts (supply/demand, opportunity cost, market value, elasticity, etc.) in a funny way
- Add humor to various sections (compensation, benefits, expectations, etc.)

The humor should be:
- More prominent and witty (but still appropriate for a business context)
- Economics-themed, clever, and genuinely funny
- Integrated naturally throughout the letter (not just at the end)
- Make the reader smile and laugh while still feeling the letter is professional
- Examples: "We've calculated the opportunity cost of not hiring you, and it's simply too high", "Your salary package includes a generous coffee budget - we've found strong correlation between caffeine and productivity (though we can't prove causation)", "We promise you'll have access to our data - and trust us, the supply is elastic, but the demand for your skills is not"`

      const response = await callChatGPT(prompt, systemMessage)
      
      const offerContent = response.content || `Dear ${name},\n\nCongratulations on your acceptance! Keep working hard!`
      setGeneratedOffer(offerContent)
    } catch (error) {
      console.error('Error generating offer:', error)
      // Show more detailed error message
      let errorMessage = 'Error generating offer. Please try again.'
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      
      // Get the offer content element
      const offerElement = document.getElementById('offer-content')
      if (!offerElement) {
        // Fallback to text download if element not found
        const blob = new Blob([generatedOffer], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `phd-offer-${name.replace(/\s+/g, '-')}.txt`
        a.click()
        URL.revokeObjectURL(url)
        setDownloading(false)
        return
      }

      // Wait a bit for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create a temporary container with better styling for PDF
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '210mm' // A4 width
      tempContainer.style.padding = '20mm'
      tempContainer.style.fontFamily = 'Arial, sans-serif'
      tempContainer.style.fontSize = '12pt'
      tempContainer.style.lineHeight = '1.6'
      tempContainer.style.color = '#000'
      tempContainer.style.backgroundColor = '#fff'
      tempContainer.style.whiteSpace = 'pre-wrap'
      
      // Clone the content and copy all styles
      const clonedContent = offerElement.cloneNode(true)
      
      // Ensure all text is visible and styled properly
      const allElements = clonedContent.querySelectorAll('*')
      allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el)
        if (computedStyle.color === 'rgb(0, 0, 0)' || computedStyle.color === 'rgb(31, 41, 55)') {
          el.style.color = '#000000'
        }
        el.style.backgroundColor = 'transparent'
      })
      
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)

      // Generate PDF with higher quality
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Clean up
      document.body.removeChild(tempContainer)

      // Save PDF
      pdf.save(`phd-offer-${name.replace(/\s+/g, '-')}.pdf`)
      setDownloading(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setDownloading(false)
      // Fallback to text download
      const blob = new Blob([generatedOffer], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `phd-offer-${name.replace(/\s+/g, '-')}.txt`
      a.click()
      URL.revokeObjectURL(url)
      alert('PDF generation failed. Downloaded as text file instead.')
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Offer Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-6">Generate Your Fake Funny Offer Letter</h2>
          
          {/* Offer Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Offer Type
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setOfferType('academic')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  offerType === 'academic'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎓 Academic
              </button>
              <button
                onClick={() => setOfferType('industry')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  offerType === 'industry'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💼 Industry
              </button>
            </div>
          </div>

          {/* Position Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Position Type
            </label>
            {offerType === 'academic' ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setAcademicPosition('phd')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    academicPosition === 'phd'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🎓 PhD Offer
                </button>
                <button
                  onClick={() => setAcademicPosition('professor')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    academicPosition === 'professor'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  👨‍🏫 Professor
                </button>
                <button
                  onClick={() => setAcademicPosition('researchAssistant')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    academicPosition === 'researchAssistant'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔬 Research Assistant
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setIndustryPosition('consultant')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    industryPosition === 'consultant'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💼 Consultant
                </button>
                <button
                  onClick={() => setIndustryPosition('analyst')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    industryPosition === 'analyst'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Analyst
                </button>
                <button
                  onClick={() => setIndustryPosition('researcher')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    industryPosition === 'researcher'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔬 Researcher
                </button>
                <button
                  onClick={() => setIndustryPosition('ngo')}
                  className={`px-4 py-3 rounded-lg font-semibold transition ${
                    industryPosition === 'ngo'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌍 NGO
                </button>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter your name..."
              className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Description <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={additionalDescription}
              onChange={handleDescriptionChange}
              placeholder="E.g., Include specific research interests, mention a particular field of economics, add any special requirements or details..."
              className="w-full max-w-2xl px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[100px]"
              maxLength={1000}
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500">
              {additionalDescription.length}/1000 characters
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !name.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Offer...' : `Generate ${offerType === 'academic' 
              ? academicPosition === 'phd' ? 'PhD' : academicPosition === 'professor' ? 'Professor' : 'Research Assistant'
              : industryPosition === 'consultant' ? 'Consultant' : industryPosition === 'analyst' ? 'Analyst' : industryPosition === 'researcher' ? 'Researcher' : 'NGO'
            } Offer Letter`}
          </button>
        </div>

        {/* Generated Offer */}
        {generatedOffer && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Your {offerType === 'academic' 
                  ? academicPosition === 'phd' ? 'PhD' : academicPosition === 'professor' ? 'Professor' : 'Research Assistant'
                  : industryPosition === 'consultant' ? 'Consultant' : industryPosition === 'analyst' ? 'Analyst' : industryPosition === 'researcher' ? 'Researcher' : 'NGO'
                } Offer Letter
              </h2>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </div>
            <div 
              id="offer-content"
              className="bg-white border-2 border-gray-200 rounded-lg p-8 shadow-inner"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '12pt',
                lineHeight: '1.6',
                color: '#000'
              }}
            >
              <div className="prose max-w-none text-gray-800">
                <ReactMarkdown>{generatedOffer}</ReactMarkdown>
              </div>
            </div>
            <p className="mt-4 text-sm text-red-600 font-semibold text-center">
              ⚠️ DISCLAIMER: This is a fictional offer letter generated for motivational purposes only. This is not a real admission offer from any university.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default OfferGenerator

