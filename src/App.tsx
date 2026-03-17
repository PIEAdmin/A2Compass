import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from './store'
import { initAuth } from './store/authSlice'
import { useAuth } from './hooks'
import { DashboardLayout } from './components/layout'
import { LoadingSpinner } from './components/common'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminBillingPage from './pages/admin/Billing'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard'
import SkillMap from './pages/teacher/SkillMap'
import LessonsList from './pages/teacher/lessons/LessonsList'
import LessonBuilder from './pages/teacher/lessons/LessonBuilder'
import ActivitiesList from './pages/teacher/activities/ActivitiesList'
import ActivityCreator from './pages/teacher/activities/ActivityCreator'
import ContentLibrary from './pages/teacher/library/ContentLibrary'
import CurriculumPlanner from './pages/teacher/curriculum/CurriculumPlanner'
import AssignmentTool from './pages/teacher/assignments/AssignmentTool'

// Parent pages
import ParentDashboard from './pages/parent/Dashboard'
import ParentBillingPage from './pages/parent/Billing'
import EnrollPage from './pages/parent/Enroll'
import GrowthTimeline from './pages/parent/GrowthTimeline'

// Student pages
import FlightPlan from './pages/student/FlightPlan'
import ActivityPlayer from './pages/student/activity-player/ActivityPlayer'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner size="lg" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const roleRoutes: Record<string, string> = {
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
        <Route path="admin/billing" element={<AdminBillingPage />} />
        <Route path="admin/subjects" element={<AdminDashboard />} />
        <Route path="admin/reports" element={<AdminDashboard />} />

        {/* Teacher Routes */}
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="teacher/students" element={<TeacherDashboard />} />
        <Route path="teacher/schedule" element={<TeacherDashboard />} />
        <Route path="teacher/mastery" element={<TeacherDashboard />} />
        <Route path="teacher/skill-map" element={<SkillMap />} />
        <Route path="teacher/lessons" element={<LessonsList />} />
        <Route path="teacher/lessons/new" element={<LessonBuilder />} />
        <Route path="teacher/lessons/:id" element={<LessonBuilder />} />
        <Route path="teacher/activities" element={<ActivitiesList />} />
        <Route path="teacher/activities/new" element={<ActivityCreator />} />
        <Route path="teacher/activities/:id" element={<ActivityCreator />} />
        <Route path="teacher/library" element={<ContentLibrary />} />
        <Route path="teacher/curriculum" element={<CurriculumPlanner />} />
        <Route path="teacher/assignments" element={<AssignmentTool />} />

        {/* Parent Routes */}
        <Route path="parent" element={<ParentDashboard />} />
        <Route path="parent/progress" element={<ParentDashboard />} />
        <Route path="parent/growth" element={<GrowthTimeline />} />
        <Route path="parent/billing" element={<ParentBillingPage />} />
        <Route path="parent/enroll" element={<EnrollPage />} />
        <Route path="parent/messages" element={<ParentDashboard />} />

        {/* Student Routes */}
        <Route path="student" element={<FlightPlan />} />
        <Route path="student/activity/:id" element={<ActivityPlayer />} />
        <Route path="student/subjects" element={<FlightPlan />} />
        <Route path="student/progress" element={<FlightPlan />} />
        <Route path="student/achievements" element={<FlightPlan />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
