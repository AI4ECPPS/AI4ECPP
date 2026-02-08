import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'

function InterviewTrainer() {
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState('')
  const [interviewType, setInterviewType] = useState('academic') // 'academic' or 'industry'
  const [interviewStyle, setInterviewStyle] = useState('technical') // 'technical' or 'behavioral'
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [questionAnswers, setQuestionAnswers] = useState({})
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAnswers, setLoadingAnswers] = useState({})

  const handleRequirementsChange = (e) => {
    const value = limitInputLength(e.target.value, 5000)
    setRequirements(value)
  }

  const handleGenerate = async (isRefresh = false) => {
    // 验证输入 - 拒绝包含脏话的输入
    const validation = validateAndSanitizeText(requirements, {
      maxLength: 5000,
      minLength: 10,
      required: true,
      filterProfanity: false // 直接拒绝脏话而不是过滤
    })

    if (!validation.valid) {
      alert(validation.message || 'Please check your input')
      return
    }

    if (!requirements.trim()) {
      alert('Please enter interview requirements')
      return
    }

    setLoading(true)
    try {
      // 使用清理后的输入
      const cleanedRequirements = validation.cleaned
      
      // 构建基于选择的 prompt
      const interviewContext = interviewType === 'academic' 
        ? 'academic/research positions (e.g., Predoc, Research Assistant, PhD programs)'
        : 'industry positions (e.g., consulting companies, economic consulting firms, data analytics roles)'
      
      const questionType = interviewStyle === 'technical'
        ? 'technical questions focusing on economics, econometrics, data analysis, research methods, and quantitative skills'
        : 'behavioral questions focusing on past experiences, problem-solving, teamwork, leadership, and situational scenarios'
      
      const prompt = `Generate ${interviewStyle === 'technical' ? 'technical' : 'behavioral'} interview questions for ${interviewContext} based on the following requirements:

${cleanedRequirements}

Please provide EXACTLY 10 ${questionType}. For each question, provide a brief answer (2-3 sentences).

Format your response as:
Question 1: [question text]
Answer 1: [brief answer]

Question 2: [question text]
Answer 2: [brief answer]

Question 3: [question text]
Answer 3: [brief answer]

...continue with Question 4, 5, 6, 7, 8, 9, and 10.

After all 10 questions and answers, provide preparation tips and notes. Format the tips section with:
📝 Important notes and tips for preparation
📚 Key topics to review
⚠️ Common pitfalls to avoid
💡 Additional helpful advice

Use emojis and clear formatting to make the tips section visually appealing and easy to read.`

      const systemMessage = interviewType === 'academic'
        ? interviewStyle === 'technical'
          ? 'You are an expert in economics and public policy research, specializing in preparing candidates for academic technical interviews (Predoc, Research Assistant positions). Generate realistic technical questions about econometrics, research methods, data analysis, and academic research experience.'
          : 'You are an expert in academic hiring, specializing in preparing candidates for behavioral interviews for academic/research positions. Generate behavioral questions about research experience, collaboration, problem-solving in academic settings, and handling research challenges.'
        : interviewStyle === 'technical'
          ? 'You are an expert in economic consulting and industry hiring, specializing in preparing candidates for technical interviews at consulting companies and economic consulting firms. Generate realistic technical questions about data analysis, economic modeling, client problem-solving, and quantitative skills relevant to consulting work.'
          : 'You are an expert in industry hiring, specializing in preparing candidates for behavioral interviews at consulting companies and economic consulting firms. Generate behavioral questions about client interactions, teamwork, handling deadlines, problem-solving in business contexts, and leadership experiences.'

      const response = await callChatGPT(prompt, systemMessage)
      
      const content = response.content || ''
      
      // Parse questions and answers from response
      const questions = []
      const answers = {}
      
      // Try to match "Question X: ... Answer X: ..." pattern
      const qaPattern = /Question\s*\d+[:\s]+([^\n]+(?:\n(?!Question|Answer)[^\n]+)*)\s*Answer\s*\d+[:\s]+([^\n]+(?:\n(?!Question|Answer)[^\n]+)*)/gi
      let match
      let idx = 0
      
      while ((match = qaPattern.exec(content)) !== null && idx < 10) {
        const questionText = match[1].trim()
        const answerText = match[2].trim()
        const category = questionText.includes('method') || questionText.includes('DID') || questionText.includes('IV') || questionText.includes('regression')
          ? 'Econometrics' 
          : questionText.includes('research') || questionText.includes('project')
          ? 'Research Experience'
          : questionText.includes('difference') || questionText.includes('explain')
          ? 'Methodology'
          : 'General'
        
        questions.push({ question: questionText, category, id: idx })
        answers[idx] = answerText
        idx++
      }
      
      // Fallback: if pattern doesn't match, try simpler pattern
      if (questions.length === 0) {
        const questionMatches = content.match(/\d+\.\s*([^\n]+)/g) || content.match(/Question[:\s]+([^\n]+)/gi) || []
        questions.push(...questionMatches.slice(0, 10).map((q, i) => {
          const questionText = q.replace(/^\d+\.\s*|^Question[:\s]+/i, '').trim()
          const category = questionText.includes('method') || questionText.includes('DID') || questionText.includes('IV')
            ? 'Econometrics' 
            : questionText.includes('research') || questionText.includes('project')
            ? 'Research Experience'
            : 'General'
          return { question: questionText, category, id: i }
        }))
      }

      // Ensure we have exactly 10 questions
      let finalQuestions = questions
      if (finalQuestions.length < 10) {
        // If we have fewer than 10, try to regenerate or pad with generic questions
        const needed = 10 - finalQuestions.length
        const genericQuestions = [
          { question: 'Explain the difference between correlation and causation.', category: 'Methodology', id: finalQuestions.length },
          { question: 'What is the difference between OLS and IV estimation?', category: 'Econometrics', id: finalQuestions.length + 1 },
          { question: 'How would you handle missing data in a research project?', category: 'Methodology', id: finalQuestions.length + 2 },
          { question: 'Describe a research project you have worked on.', category: 'Research Experience', id: finalQuestions.length + 3 },
          { question: 'What is the difference between fixed effects and random effects models?', category: 'Econometrics', id: finalQuestions.length + 4 },
          { question: 'How do you approach a new research question?', category: 'Methodology', id: finalQuestions.length + 5 },
          { question: 'Explain the concept of instrumental variables.', category: 'Econometrics', id: finalQuestions.length + 6 },
          { question: 'What statistical software are you most comfortable with?', category: 'General', id: finalQuestions.length + 7 },
          { question: 'How do you ensure the validity of your research findings?', category: 'Methodology', id: finalQuestions.length + 8 },
          { question: 'What is your experience with difference-in-differences analysis?', category: 'Econometrics', id: finalQuestions.length + 9 }
        ]
        finalQuestions = [...finalQuestions, ...genericQuestions.slice(0, needed)]
      } else if (finalQuestions.length > 10) {
        // If we have more than 10, take only the first 10
        finalQuestions = finalQuestions.slice(0, 10)
      }
      
      // Ensure all questions have sequential IDs from 0 to 9
      finalQuestions = finalQuestions.map((q, idx) => ({ ...q, id: idx }))
      
      setGeneratedQuestions(finalQuestions)
      
      // Generate answers for questions that don't have them
      if (Object.keys(answers).length > 0) {
        setQuestionAnswers(answers)
      } else {
        // Generate answers for all questions asynchronously
        generateAnswersForQuestions(finalQuestions)
      }
      
      // Extract notes (everything after "Notes", "Tips", or emoji markers)
      const notesMatch = content.match(/(?:notes|tips|preparation|📝|📚|⚠️|💡)[:\s]+([\s\S]+)/i) || 
                        content.match(/(?:📝|📚|⚠️|💡)[\s\S]+/i) ||
                        content.match(/After all 10 questions[:\s]+([\s\S]+)/i)
      const extractedNotes = notesMatch ? notesMatch[1] || notesMatch[0] : content.split('Question')[0] || 'Please review core concepts and be prepared to discuss your experience.'

      setNotes(extractedNotes)
    } catch (error) {
      alert('Error generating interview questions. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnswersForQuestions = async (questions) => {
    const answers = {}
    setLoadingAnswers({})
    
    const context = interviewType === 'academic' 
      ? 'academic/research position (e.g., Predoc, Research Assistant)'
      : 'industry position (e.g., consulting company, economic consulting firm)'
    
    const answerStyle = interviewStyle === 'technical'
      ? 'technical answer focusing on accuracy, methodology, and quantitative skills'
      : 'behavioral answer using the STAR method (Situation, Task, Action, Result) with concrete examples'
    
    for (const q of questions) {
      setLoadingAnswers(prev => ({ ...prev, [q.id]: true }))
      try {
        const prompt = `Provide a brief, professional answer (2-3 sentences) to this ${interviewStyle} interview question for a ${context}:

${q.question}

Keep the answer concise, accurate, and suitable for a ${interviewStyle} interview. ${interviewStyle === 'behavioral' ? 'Use the STAR method if applicable.' : ''}`
        
        const systemMessage = interviewType === 'academic'
          ? interviewStyle === 'technical'
            ? 'You are an expert interviewer helping candidates prepare for technical interviews in economics and public policy research.'
            : 'You are an expert interviewer helping candidates prepare for behavioral interviews for academic/research positions.'
          : interviewStyle === 'technical'
            ? 'You are an expert interviewer helping candidates prepare for technical interviews at consulting companies and economic consulting firms.'
            : 'You are an expert interviewer helping candidates prepare for behavioral interviews at consulting companies and economic consulting firms.'
        
        const response = await callChatGPT(prompt, systemMessage)
        answers[q.id] = response.content || 'Answer will be generated...'
      } catch (error) {
        console.error(`Error generating answer for question ${q.id}:`, error)
        answers[q.id] = 'Unable to generate answer. Please try again.'
      } finally {
        setLoadingAnswers(prev => ({ ...prev, [q.id]: false }))
      }
    }
    
    setQuestionAnswers(answers)
  }

  const toggleAnswer = (questionId) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
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
            <h1 className="text-2xl font-bold text-gray-800">Interview Trainer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-6">Interview Configuration</h2>
          
          {/* Interview Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interview Type
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setInterviewType('academic')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  interviewType === 'academic'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎓 Academic
              </button>
              <button
                onClick={() => setInterviewType('industry')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  interviewType === 'industry'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💼 Industry (e.g., Consulting)
              </button>
            </div>
          </div>

          {/* Interview Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interview Style
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setInterviewStyle('technical')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  interviewStyle === 'technical'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔧 Technical
              </button>
              <button
                onClick={() => setInterviewStyle('behavioral')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  interviewStyle === 'behavioral'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💬 Behavioral
              </button>
            </div>
          </div>

          {/* Requirements Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={requirements}
              onChange={handleRequirementsChange}
              placeholder={`Enter specific interview requirements or job description. For example: ${
                interviewType === 'academic' 
                  ? "'Predoc research assistant position focusing on labor economics, requires knowledge of causal inference methods, experience with Stata...'"
                  : "'Economic consulting analyst position, requires strong quantitative skills, experience with Excel and data analysis, ability to work with clients...'"
              }`}
              maxLength={5000}
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              {requirements.length}/5000 characters
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Questions...' : `Generate ${interviewStyle === 'technical' ? 'Technical' : 'Behavioral'} Interview Questions`}
          </button>
        </div>

        {/* Generated Questions */}
        {generatedQuestions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Interview Questions</h2>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Generating...' : '🔄 Generate New Questions'}
              </button>
            </div>
            <div className="space-y-6">
              {generatedQuestions.map((item) => (
                <div key={item.id} className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-gray-800 font-medium mb-3">{item.question}</p>
                  
                  {/* Answer Section */}
                  {loadingAnswers[item.id] ? (
                    <div className="text-sm text-gray-500 italic">Generating answer...</div>
                  ) : questionAnswers[item.id] ? (
                    <div>
                      <button
                        onClick={() => toggleAnswer(item.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold mb-2 flex items-center gap-1"
                      >
                        {expandedAnswers[item.id] ? '▼' : '▶'} 
                        {expandedAnswers[item.id] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {expandedAnswers[item.id] && (
                        <div className="bg-white border border-indigo-200 rounded-lg p-4 mt-2">
                          <p className="text-gray-700 text-sm leading-relaxed">{questionAnswers[item.id]}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Answer will be generated...</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preparation Notes */}
        {notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>💡</span>
              Preparation Notes & Tips
            </h2>
            <div className="prose max-w-none bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-indigo-200 text-sm">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-3" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="ml-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-indigo-700" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-indigo-800" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-2 text-indigo-700" {...props} />,
                  }}
                >
                  {notes}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default InterviewTrainer

