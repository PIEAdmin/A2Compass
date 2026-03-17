import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from './store'
import { initAuth } from './store/authSlice'
import { useAuth } from './hooks'
import { DashboardLayout } from './components/layout'
import { LoadingSpinner } from './components/common'
import LoginPage from './pages/auth/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import TeacherDashboard from './pages/teacher/Dashboard'
import ParentDashboard from './pages/parent/Dashboard'
import StudentDashboard from './pages/student/Dashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner size="lg" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(initAuth())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<RoleRedirect />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="parent" element={<ParentDashboard />} />
        <Route path="student" element={<StudentDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
