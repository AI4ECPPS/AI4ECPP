import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'

const STORAGE_KEY = 'interviewTrainerSessions'
const TIMER_SECONDS = 120 // 2 min per question

// Parse STAR (Situation, Task, Action, Result) from answer text
function parseSTAR(text) {
  if (!text || typeof text !== 'string') return null
  const s = text.replace(/\r\n/g, '\n')
  const situation = s.match(/(?:Situation|S)[:\s]*([^\n]+(?:\n(?!Task|Action|Result|T:|A:|R:)[^\n]+)*)/i)?.[1]?.trim()
  const task = s.match(/(?:Task|T)[:\s]*([^\n]+(?:\n(?!Situation|Action|Result|S:|A:|R:)[^\n]+)*)/i)?.[1]?.trim()
  const action = s.match(/(?:Action|A)[:\s]*([^\n]+(?:\n(?!Situation|Task|Result|S:|T:|R:)[^\n]+)*)/i)?.[1]?.trim()
  const result = s.match(/(?:Result|R)[:\s]*([^\n]+(?:\n(?!Situation|Task|Action|S:|T:|A:)[^\n]+)*)/i)?.[1]?.trim()
  if ([situation, task, action, result].every(Boolean)) {
    return { situation, task, action, result }
  }
  return null
}

// Extract JSON from response (handle ```json ... ``` wrapper)
function extractJSON(content) {
  const trimmed = (content || '').trim()
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = codeBlock ? codeBlock[1].trim() : trimmed
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function InterviewTrainer() {
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState('')
  const [interviewType, setInterviewType] = useState('academic')
  const [interviewStyle, setInterviewStyle] = useState('technical')
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [questionAnswers, setQuestionAnswers] = useState({})
  const [answerDetails, setAnswerDetails] = useState({}) // { [id]: { keyPoints?: string[], star?: {...} } }
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAnswers, setLoadingAnswers] = useState({})
  const [followUps, setFollowUps] = useState({}) // { [questionId]: string[] }
  const [loadingFollowUp, setLoadingFollowUp] = useState({})
  const [timedMode, setTimedMode] = useState(false)
  const [timedQuestionId, setTimedQuestionId] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)
  const [savedSessions, setSavedSessions] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)

  // Load saved sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const list = raw ? JSON.parse(raw) : []
      setSavedSessions(Array.isArray(list) ? list : [])
    } catch {
      setSavedSessions([])
    }
  }, [showLoadModal])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      if (timedQuestionId !== null) {
        setExpandedAnswers(prev => ({ ...prev, [timedQuestionId]: true }))
        setTimedQuestionId(null)
      }
      setTimeLeft(null)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timeLeft, timedQuestionId])

  const handleRequirementsChange = (e) => {
    setRequirements(limitInputLength(e.target.value, 5000))
  }

  const handleGenerate = async () => {
    const validation = validateAndSanitizeText(requirements, {
      maxLength: 5000,
      minLength: 10,
      required: true,
      filterProfanity: false
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
    setFollowUps({})
    setAnswerDetails({})
    try {
      const cleanedRequirements = validation.cleaned
      const interviewContext = interviewType === 'academic'
        ? 'academic/research positions (e.g., Predoc, Research Assistant, PhD programs)'
        : 'industry positions (e.g., consulting companies, economic consulting firms, data analytics roles)'
      const isTechnical = interviewStyle === 'technical'

      const jsonInstruction = isTechnical
        ? `Respond with ONLY a valid JSON object (no markdown, no extra text). Use this exact structure:
{
  "questions": [ { "question": "question text", "category": "Econometrics|Methodology|Research Experience|General" } ],
  "answers": [ "full answer 1", "full answer 2", ... ],
  "answerKeyPoints": [ ["point1", "point2"], ["point1", "point2"], ... ],
  "notes": "Preparation tips: key topics, pitfalls, advice (use clear formatting)"
}
Provide exactly 10 questions and 10 answers. For each answer in answerKeyPoints provide 2-4 bullet points.`
        : `Respond with ONLY a valid JSON object (no markdown, no extra text). Use this exact structure:
{
  "questions": [ { "question": "question text", "category": "Behavioral|Experience|..." } ],
  "answers": [ "answer with STAR structure. Start with Situation:, then Task:, Action:, Result: so each part is clearly labeled.", ... ],
  "notes": "Preparation tips and advice (use clear formatting)"
}
Provide exactly 10 questions and 10 answers. Each answer must include the labels Situation:, Task:, Action:, Result: in the text.`

      const prompt = `Generate ${interviewStyle} interview questions for ${interviewContext} based on:

${cleanedRequirements}

${jsonInstruction}`

      const systemMessage = interviewType === 'academic'
        ? isTechnical
          ? 'You are an expert in economics and public policy research, preparing candidates for academic technical interviews (Predoc, RA). Generate realistic technical questions and concise, accurate answers with key points.'
          : 'You are an expert in academic hiring, preparing candidates for behavioral interviews. Generate behavioral questions and answers using the STAR method with clear Situation, Task, Action, Result labels.'
        : isTechnical
          ? 'You are an expert in economic consulting hiring, preparing candidates for technical interviews. Generate technical questions and concise answers with key points.'
          : 'You are an expert in industry hiring, preparing candidates for behavioral interviews. Generate behavioral questions and STAR-format answers with clear labels.'

      const response = await callChatGPT(prompt, systemMessage)
      const content = response.content || ''
      const data = extractJSON(content)

      let finalQuestions = []
      let answers = {}
      let details = {}
      let extractedNotes = 'Please review core concepts and be prepared to discuss your experience.'

      if (data && Array.isArray(data.questions) && data.questions.length >= 10) {
        finalQuestions = data.questions.slice(0, 10).map((q, idx) => ({
          question: typeof q === 'string' ? q : (q.question || ''),
          category: (typeof q === 'object' && q.category) ? q.category : 'General',
          id: idx
        }))
        const ansList = Array.isArray(data.answers) ? data.answers : []
        ansList.forEach((a, idx) => {
          if (idx < 10) {
            const text = typeof a === 'string' ? a : (a?.full || a?.answer || '')
            answers[idx] = text
            if (isTechnical && Array.isArray(data.answerKeyPoints) && data.answerKeyPoints[idx]) {
              details[idx] = { keyPoints: data.answerKeyPoints[idx] }
            } else if (!isTechnical && text) {
              const star = parseSTAR(text)
              if (star) details[idx] = { star }
            }
          }
        })
        if (typeof data.notes === 'string' && data.notes.trim()) extractedNotes = data.notes.trim()
      }

      if (finalQuestions.length < 10) {
        const qaPattern = /Question\s*\d+[:\s]+([^\n]+(?:\n(?!Question|Answer)[^\n]+)*)\s*Answer\s*\d+[:\s]+([^\n]+(?:\n(?!Question|Answer)[^\n]+)*)/gi
        let match
        let idx = 0
        while ((match = qaPattern.exec(content)) !== null && idx < 10) {
          const questionText = match[1].trim()
          const answerText = match[2].trim()
          const category = questionText.includes('method') || questionText.includes('DID') || questionText.includes('IV') ? 'Econometrics' : questionText.includes('research') || questionText.includes('project') ? 'Research Experience' : questionText.includes('difference') || questionText.includes('explain') ? 'Methodology' : 'General'
          finalQuestions.push({ question: questionText, category, id: idx })
          answers[idx] = answerText
          if (!isTechnical && answerText) {
            const star = parseSTAR(answerText)
            if (star) details[idx] = { star }
          }
          idx++
        }
        const notesMatch = content.match(/(?:notes|tips|preparation|📝|📚|⚠️|💡)[:\s]+([\s\S]+)/i) || content.match(/(?:📝|📚|⚠️|💡)[\s\S]+/i)
        if (notesMatch) extractedNotes = (notesMatch[1] || notesMatch[0] || '').trim()
      }

      if (finalQuestions.length < 10) {
        const simpleQ = content.match(/\d+\.\s*([^\n]+)/g) || content.match(/Question[:\s]+([^\n]+)/gi) || []
        finalQuestions = simpleQ.slice(0, 10).map((q, i) => {
          const questionText = q.replace(/^\d+\.\s*|^Question[:\s]+/i, '').trim()
          const category = questionText.includes('method') || questionText.includes('DID') || questionText.includes('IV') ? 'Econometrics' : questionText.includes('research') || questionText.includes('project') ? 'Research Experience' : 'General'
          return { question: questionText, category, id: i }
        })
      }
      finalQuestions = finalQuestions.slice(0, 10).map((q, idx) => ({ ...q, id: idx }))

      setGeneratedQuestions(finalQuestions)
      setQuestionAnswers(answers)
      setAnswerDetails(details)

      const missingAnswerIds = finalQuestions.filter(q => answers[q.id] == null || answers[q.id] === '').map(q => q.id)
      if (missingAnswerIds.length > 0) {
        await generateAnswersBatched(finalQuestions, missingAnswerIds, isTechnical)
      }
      setNotes(extractedNotes)
    } catch (error) {
      alert('Error generating interview questions. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function generateAnswersBatched(questions, missingIds, isTechnical) {
    const batchSize = 3
    setLoadingAnswers(Object.fromEntries(missingIds.map(id => [id, true])))

    for (let i = 0; i < missingIds.length; i += batchSize) {
      const batch = missingIds.slice(i, i + batchSize)
      const batchQuestions = batch.map(id => questions.find(q => q.id === id)).filter(Boolean)
      const prompt = `For each of the following ${interviewStyle} interview questions, provide a brief professional answer (2-3 sentences). ${!isTechnical ? 'Use STAR (Situation, Task, Action, Result) and label each part.' : 'Focus on accuracy and key points.'}

Respond with ONLY a JSON array of answers in order, one string per question. Example: ["answer 1", "answer 2", "answer 3"]

Questions:
${batchQuestions.map((q, j) => `${j + 1}. ${q.question}`).join('\n')}`

      const systemMessage = isTechnical
        ? 'You are an expert helping candidates prepare for technical interviews. Reply with a JSON array of answer strings only.'
        : 'You are an expert helping candidates prepare for behavioral interviews. Reply with a JSON array of answer strings, each using Situation:, Task:, Action:, Result:.'

      try {
        const response = await callChatGPT(prompt, systemMessage)
        const data = extractJSON(response.content || '')
        const ansArray = Array.isArray(data) ? data : (data && Array.isArray(data.answers) ? data.answers : null)
        if (ansArray) {
          const newAnswers = {}
          const newDetails = {}
          batch.forEach((id, j) => {
            const text = ansArray[j]
            if (text != null) {
              newAnswers[id] = typeof text === 'string' ? text : String(text)
              if (!isTechnical && newAnswers[id]) {
                const star = parseSTAR(newAnswers[id])
                if (star) newDetails[id] = { star }
              }
            }
          })
          setQuestionAnswers(prev => ({ ...prev, ...newAnswers }))
          setAnswerDetails(prev => ({ ...prev, ...newDetails }))
        }
      } catch (e) {
        const fallback = Object.fromEntries(batch.map(id => [id, 'Unable to generate answer. Please try again.']))
        setQuestionAnswers(prev => ({ ...prev, ...fallback }))
      }
    }

    setLoadingAnswers({})
  }

  const toggleAnswer = (questionId) => {
    setExpandedAnswers(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const expandAllAnswers = () => {
    if (generatedQuestions.length === 0) return
    setExpandedAnswers(Object.fromEntries(generatedQuestions.map(q => [q.id, true])))
  }

  const collapseAllAnswers = () => {
    setExpandedAnswers({})
  }

  const handleSaveSession = () => {
    const name = `Session ${new Date().toLocaleString()}`
    const session = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      config: { requirements, interviewType, interviewStyle },
      generatedQuestions,
      questionAnswers,
      answerDetails,
      notes
    }
    const list = [...savedSessions, session]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    setSavedSessions(list)
    setShowSaveModal(false)
  }

  const handleLoadSession = (session) => {
    setRequirements(session.config?.requirements ?? '')
    setInterviewType(session.config?.interviewType ?? 'academic')
    setInterviewStyle(session.config?.interviewStyle ?? 'technical')
    setGeneratedQuestions(session.generatedQuestions ?? [])
    setQuestionAnswers(session.questionAnswers ?? {})
    setAnswerDetails(session.answerDetails ?? {})
    setNotes(session.notes ?? '')
    setExpandedAnswers({})
    setShowLoadModal(false)
  }

  const handleDeleteSession = (id) => {
    const list = savedSessions.filter(s => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    setSavedSessions(list)
  }

  const exportMarkdown = () => {
    const lines = ['# Interview Practice', '', `Type: ${interviewType} | Style: ${interviewStyle}`, '', '---', '']
    generatedQuestions.forEach((q, i) => {
      lines.push(`## ${i + 1}. ${q.question}`, '', `*${q.category}*`, '')
      const ans = questionAnswers[q.id]
      if (ans) {
        const star = answerDetails[q.id]?.star
        if (star) {
          lines.push('**Situation:**', star.situation, '', '**Task:**', star.task, '', '**Action:**', star.action, '', '**Result:**', star.result, '')
        } else {
          const kp = answerDetails[q.id]?.keyPoints
          if (kp && kp.length) {
            lines.push('**Key points:**', ...kp.map(p => `- ${p}`), '', '**Full answer:**', ans, '')
          } else lines.push(ans, '')
        }
      }
      lines.push('---', '')
    })
    lines.push('## Preparation Notes', '', notes)
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-practice-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyMarkdown = () => {
    const lines = ['# Interview Practice', '', `Type: ${interviewType} | Style: ${interviewStyle}`, '']
    generatedQuestions.forEach((q, i) => {
      lines.push(`## ${i + 1}. ${q.question}`, '', `*${q.category}*`, '')
      const ans = questionAnswers[q.id]
      if (ans) lines.push(ans, '')
      lines.push('')
    })
    lines.push('## Preparation Notes', '', notes)
    navigator.clipboard.writeText(lines.join('\n'))
    alert('Copied to clipboard.')
  }

  const startTimerForQuestion = (questionId) => {
    setTimedQuestionId(questionId)
    setExpandedAnswers(prev => ({ ...prev, [questionId]: false }))
    setTimeLeft(TIMER_SECONDS)
  }

  const handleGenerateFollowUp = async (questionId, questionText) => {
    setLoadingFollowUp(prev => ({ ...prev, [questionId]: true }))
    try {
      const prompt = `For this interview question, generate 1 or 2 short follow-up questions that an interviewer might ask next. Return ONLY a JSON array of strings. Example: ["Follow-up question 1?", "Follow-up question 2?"]

Question: ${questionText}`
      const response = await callChatGPT(prompt, 'You are an expert interviewer. Reply with a JSON array of 1-2 follow-up question strings only.')
      const data = extractJSON(response.content || '')
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.followUps) ? data.followUps : [])
      const followUpStrings = list.slice(0, 2).map(f => typeof f === 'string' ? f : String(f))
      setFollowUps(prev => ({ ...prev, [questionId]: followUpStrings }))
    } catch {
      setFollowUps(prev => ({ ...prev, [questionId]: ['Unable to generate follow-ups.'] }))
    } finally {
      setLoadingFollowUp(prev => ({ ...prev, [questionId]: false }))
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold">Interview Questions</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 text-sm"
                >
                  {loading ? 'Generating...' : '🔄 New'}
                </button>
                <button onClick={expandAllAnswers} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  Expand all
                </button>
                <button onClick={collapseAllAnswers} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  Collapse all
                </button>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={timedMode} onChange={(e) => setTimedMode(e.target.checked)} />
                  Timed (2 min)
                </label>
                <button onClick={() => setShowSaveModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
                  Save
                </button>
                <button onClick={() => setShowLoadModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
                  Load
                </button>
                <button onClick={copyMarkdown} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                  Copy MD
                </button>
                <button onClick={exportMarkdown} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                  Export .md
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {generatedQuestions.map((item) => (
                <div key={item.id} className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    {timedMode && (
                      <button
                        onClick={() => startTimerForQuestion(item.id)}
                        className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        ⏱ Start 2 min
                      </button>
                    )}
                    {timedQuestionId === item.id && timeLeft != null && (
                      <span className="text-sm font-mono text-amber-700">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    )}
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
                        {expandedAnswers[item.id] ? '▼' : '▶'} {expandedAnswers[item.id] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {expandedAnswers[item.id] && (
                        <div className="bg-white border border-indigo-200 rounded-lg p-4 mt-2 space-y-3">
                          {interviewStyle === 'behavioral' && answerDetails[item.id]?.star ? (
                            <div className="grid gap-2 text-sm">
                              <div><span className="font-semibold text-indigo-700">Situation:</span> <span className="text-gray-700">{answerDetails[item.id].star.situation}</span></div>
                              <div><span className="font-semibold text-indigo-700">Task:</span> <span className="text-gray-700">{answerDetails[item.id].star.task}</span></div>
                              <div><span className="font-semibold text-indigo-700">Action:</span> <span className="text-gray-700">{answerDetails[item.id].star.action}</span></div>
                              <div><span className="font-semibold text-indigo-700">Result:</span> <span className="text-gray-700">{answerDetails[item.id].star.result}</span></div>
                            </div>
                          ) : interviewStyle === 'technical' && answerDetails[item.id]?.keyPoints?.length > 0 ? (
                            <>
                              <div className="text-sm">
                                <span className="font-semibold text-indigo-700">Key points:</span>
                                <ul className="list-disc list-inside mt-1 text-gray-700">
                                  {answerDetails[item.id].keyPoints.map((p, i) => (
                                    <li key={i}>{p}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="text-sm pt-2 border-t border-gray-200">
                                <span className="font-semibold text-indigo-700">Full answer:</span>
                                <p className="text-gray-700 mt-1 leading-relaxed">{questionAnswers[item.id]}</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-gray-700 text-sm leading-relaxed">{questionAnswers[item.id]}</p>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <button
                          onClick={() => handleGenerateFollowUp(item.id, item.question)}
                          disabled={loadingFollowUp[item.id]}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {loadingFollowUp[item.id] ? '...' : '+ Follow-up questions'}
                        </button>
                        {followUps[item.id]?.length > 0 && (
                          <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                            {followUps[item.id].map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Answer will be generated...</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveModal(false)}>
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">Save session</h3>
              <p className="text-gray-600 text-sm mb-4">Save current questions, answers, and notes to this device.</p>
              <div className="flex gap-2">
                <button onClick={handleSaveSession} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
                <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Load modal */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLoadModal(false)}>
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold p-4 border-b">Load session</h3>
              <div className="overflow-y-auto p-4 flex-1">
                {savedSessions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No saved sessions.</p>
                ) : (
                  <ul className="space-y-2">
                    {savedSessions.map(s => (
                      <li key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{s.name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleLoadSession(s)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Load</button>
                          <button onClick={() => handleDeleteSession(s.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 border-t">
                <button onClick={() => setShowLoadModal(false)} className="w-full px-4 py-2 bg-gray-200 rounded-lg">Close</button>
              </div>
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

