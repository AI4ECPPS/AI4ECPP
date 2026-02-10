import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ProfessionDashboard from './pages/ProfessionDashboard'
import PolicyAnalyst from './pages/PolicyAnalyst'
import PolicyMemoGenerator from './pages/PolicyMemoGenerator'
import MyDocuments from './pages/MyDocuments'
import PaperDeconstructor from './pages/PaperDeconstructor'
import EmpiricalCopilot from './pages/EmpiricalCopilot'
import InterviewTrainer from './pages/InterviewTrainer'
import OfferGenerator from './pages/OfferGenerator'
import OutsideLinks from './pages/OutsideLinks'
import FindProfessors from './pages/FindProfessors'
import BookList from './pages/BookList'
import PicToLatex from './pages/PicToLatex'
import Settings from './pages/Settings'
import Topics from './pages/Topics'
import TopicDetail from './pages/TopicDetail'
import Knowledge from './pages/Knowledge'
import KnowledgeDetail from './pages/KnowledgeDetail'
import CareerPath from './pages/CareerPath'
import CareerPathDetail from './pages/CareerPathDetail'
import ProofWriter from './pages/ProofWriter'
import CoverLetterEditor from './pages/CoverLetterEditor'
import PolicyInterpretation from './pages/PolicyInterpretation'
import CodingHelper from './pages/CodingHelper'
import LiteratureHelper from './pages/LiteratureHelper'
import SurveyChecker from './pages/SurveyChecker'
import ResearchDesignAdvisor from './pages/ResearchDesignAdvisor'
import DesignChecker from './pages/DesignChecker'
import RobustnessGenerator from './pages/RobustnessGenerator'
import NLAnalyst from './pages/NLAnalyst'
import PaperReplication from './pages/PaperReplication'
import NLCodeRunner from './pages/NLCodeRunner'
import CodeSnippetLibrary from './pages/CodeSnippetLibrary'
import GameTheoryLab from './pages/GameTheoryLab'
import MicroeconomicsLab from './pages/MicroeconomicsLab'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    // Check if user is logged in or in guest mode
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken')
      const guestMode = localStorage.getItem('guestMode') === 'true'
      setIsAuthenticated(!!token)
      setIsGuest(guestMode && !token)
    }
    
    checkAuthStatus()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      checkAuthStatus()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically in case changes happen in same window
    const interval = setInterval(checkAuthStatus, 500)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const handleGuestMode = () => {
    setIsGuest(true)
    setIsAuthenticated(false)
  }

  return (
    <Router>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} onGuestMode={handleGuestMode} />} />
        <Route path="/signup" element={<SignUp setIsAuthenticated={setIsAuthenticated} />} />
        <Route
          path="/dashboard"
          element={<Dashboard isAuthenticated={isAuthenticated} isGuest={isGuest} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/profession-dashboard"
          element={<ProfessionDashboard isAuthenticated={isAuthenticated} isGuest={isGuest} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/policy-analyst"
          element={isAuthenticated ? <PolicyAnalyst /> : <Navigate to="/login" />}
        />
        <Route
          path="/policy-interpretation"
          element={isAuthenticated ? <PolicyInterpretation /> : <Navigate to="/login" />}
        />
        <Route
          path="/coding-helper"
          element={isAuthenticated ? <CodingHelper /> : <Navigate to="/login" />}
        />
        <Route
          path="/literature-helper"
          element={isAuthenticated ? <LiteratureHelper /> : <Navigate to="/login" />}
        />
        <Route path="/rag" element={<Navigate to="/documents" replace />} />
        <Route path="/documents" element={isAuthenticated ? <MyDocuments /> : <Navigate to="/login" />} />
        <Route
          path="/survey-checker"
          element={isAuthenticated ? <SurveyChecker /> : <Navigate to="/login" />}
        />
        <Route
          path="/research-design"
          element={isAuthenticated ? <ResearchDesignAdvisor /> : <Navigate to="/login" />}
        />
        <Route
          path="/design-checker"
          element={isAuthenticated ? <DesignChecker /> : <Navigate to="/login" />}
        />
        <Route
          path="/nl-code-runner"
          element={isAuthenticated ? <NLCodeRunner /> : <Navigate to="/login" />}
        />
        <Route
          path="/code-snippet-library"
          element={isAuthenticated ? <CodeSnippetLibrary /> : <Navigate to="/login" />}
        />
        <Route
          path="/game-theory-lab"
          element={isAuthenticated ? <GameTheoryLab /> : <Navigate to="/login" />}
        />
        <Route
          path="/microeconomics-lab"
          element={isAuthenticated ? <MicroeconomicsLab /> : <Navigate to="/login" />}
        />
        <Route
          path="/robustness-generator"
          element={isAuthenticated ? <RobustnessGenerator /> : <Navigate to="/login" />}
        />
        <Route
          path="/nl-analyst"
          element={isAuthenticated ? <NLAnalyst /> : <Navigate to="/login" />}
        />
        <Route
          path="/policy-dl-agent"
          element={<Navigate to="/profession-dashboard" replace />}
        />
        <Route
          path="/policy-memo"
          element={isAuthenticated ? <PolicyMemoGenerator /> : <Navigate to="/login" />}
        />
        <Route
          path="/paper-deconstructor"
          element={isAuthenticated ? <PaperDeconstructor /> : <Navigate to="/login" />}
        />
        <Route
          path="/empirical-copilot"
          element={isAuthenticated ? <EmpiricalCopilot /> : <Navigate to="/login" />}
        />
        <Route
          path="/interview-trainer"
          element={isAuthenticated ? <InterviewTrainer /> : <Navigate to="/login" />}
        />
        {/* Guest-accessible routes */}
        <Route
          path="/offer-generator"
          element={(isAuthenticated || isGuest) ? <OfferGenerator /> : <Navigate to="/login" />}
        />
        <Route
          path="/outside-links"
          element={(isAuthenticated || isGuest) ? <OutsideLinks /> : <Navigate to="/login" />}
        />
        <Route
          path="/paper-replication"
          element={(isAuthenticated || isGuest) ? <PaperReplication /> : <Navigate to="/login" />}
        />
        <Route
          path="/find-professors"
          element={(isAuthenticated || isGuest) ? <FindProfessors /> : <Navigate to="/login" />}
        />
        <Route
          path="/book-list"
          element={(isAuthenticated || isGuest) ? <BookList /> : <Navigate to="/login" />}
        />
        <Route
          path="/pic-to-latex"
          element={isAuthenticated ? <PicToLatex /> : <Navigate to="/login" />}
        />
        <Route
          path="/proof-writer"
          element={isAuthenticated ? <ProofWriter /> : <Navigate to="/login" />}
        />
        <Route
          path="/cover-letter-editor"
          element={isAuthenticated ? <CoverLetterEditor /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
        />
        <Route
          path="/topics"
          element={(isAuthenticated || isGuest) ? <Topics /> : <Navigate to="/login" />}
        />
        <Route
          path="/topics/:topicId"
          element={(isAuthenticated || isGuest) ? <TopicDetail /> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge"
          element={(isAuthenticated || isGuest) ? <Knowledge /> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge/:topicId"
          element={(isAuthenticated || isGuest) ? <KnowledgeDetail /> : <Navigate to="/login" />}
        />
        <Route
          path="/career-path"
          element={(isAuthenticated || isGuest) ? <CareerPath /> : <Navigate to="/login" />}
        />
        <Route
          path="/career-path/:pathId"
          element={(isAuthenticated || isGuest) ? <CareerPathDetail /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Welcome />} />
      </Routes>
    </Router>
  )
}

export default App

