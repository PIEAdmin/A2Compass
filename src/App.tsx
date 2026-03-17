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
  const roleRoutes = {
    admin: '/admin',
    teacher: '/teacher',
    parent: '/parent',
    student: '/student',
  }
  return <Navigate to={roleRoutes[user.role] || '/student'} replace />
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

        {/* Admin Routes */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/students" element={<AdminDashboard />} />
        <Route path="admin/enrollment" element={<AdminDashboard />} />
        <Route path="admin/billing" element={<AdminDashboard />} />
        <Route path="admin/subjects" element={<AdminDashboard />} />
        <Route path="admin/reports" element={<AdminDashboard />} />

        {/* Teacher Routes */}
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="teacher/students" element={<TeacherDashboard />} />
        <Route path="teacher/schedule" element={<TeacherDashboard />} />
        <Route path="teacher/mastery" element={<TeacherDashboard />} />
        <Route path="teacher/lessons" element={<TeacherDashboard />} />

        {/* Parent Routes */}
        <Route path="parent" element={<ParentDashboard />} />
        <Route path="parent/progress" element={<ParentDashboard />} />
        <Route path="parent/billing" element={<ParentDashboard />} />
        <Route path="parent/messages" element={<ParentDashboard />} />

        {/* Student Routes */}
        <Route path="student" element={<StudentDashboard />} />
        <Route path="student/subjects" element={<StudentDashboard />} />
        <Route path="student/progress" element={<StudentDashboard />} />
        <Route path="student/achievements" element={<StudentDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
