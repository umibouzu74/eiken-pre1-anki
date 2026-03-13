import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './components/auth/AuthContext'
import LoginPage from './components/auth/LoginPage'
import StudentHome from './components/student/StudentHome'
import Flashcard from './components/student/Flashcard'
import Quiz4 from './components/student/Quiz4'
import QuizTyping from './components/student/QuizTyping'
import Results from './components/student/Results'
// Teacher pages (Phase 3)
// import Dashboard from './components/teacher/Dashboard'
// import ClassDetail from './components/teacher/ClassDetail'
// import StudentDetail from './components/teacher/StudentDetail'
// import AssignmentForm from './components/teacher/AssignmentForm'
// import ExportCSV from './components/teacher/ExportCSV'

function ProtectedStudent({ children }) {
  const { student } = useAuth()
  if (!student) return <Navigate to="/" replace />
  return children
}

function ProtectedTeacher({ children }) {
  const { teacher } = useAuth()
  if (!teacher) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedStudent><StudentHome /></ProtectedStudent>
      } />
      <Route path="/student/flashcard" element={
        <ProtectedStudent><Flashcard /></ProtectedStudent>
      } />
      <Route path="/student/quiz4" element={
        <ProtectedStudent><Quiz4 /></ProtectedStudent>
      } />
      <Route path="/student/typing" element={
        <ProtectedStudent><QuizTyping /></ProtectedStudent>
      } />
      <Route path="/student/results" element={
        <ProtectedStudent><Results /></ProtectedStudent>
      } />

      {/* Teacher routes (Phase 3) */}
      {/*
      <Route path="/teacher" element={
        <ProtectedTeacher><Dashboard /></ProtectedTeacher>
      } />
      <Route path="/teacher/class/:code" element={
        <ProtectedTeacher><ClassDetail /></ProtectedTeacher>
      } />
      <Route path="/teacher/student/:id" element={
        <ProtectedTeacher><StudentDetail /></ProtectedTeacher>
      } />
      <Route path="/teacher/assign" element={
        <ProtectedTeacher><AssignmentForm /></ProtectedTeacher>
      } />
      <Route path="/teacher/export" element={
        <ProtectedTeacher><ExportCSV /></ProtectedTeacher>
      } />
      */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
