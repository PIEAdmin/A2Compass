import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from './store'
import { initAuth } from './store/authSlice'
import { useAuth } from './hooks'
import { DashboardLayout } from './components/layout'
import { LoadingSpinner } from './components/common'

// Lazy-loaded pages — each downloads only when visited
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const DeleteAccount = lazy(() => import('./pages/settings/DeleteAccount'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminBillingPage = lazy(() => import('./pages/admin/Billing'))
const ApiSettings = lazy(() => import('./pages/admin/ApiSettings'))
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'))
const MissionControl = lazy(() => import('./pages/teacher/MissionControl'))
const SkillMap = lazy(() => import('./pages/teacher/SkillMap'))
const LessonsList = lazy(() => import('./pages/teacher/lessons/LessonsList'))
const LessonBuilder = lazy(() => import('./pages/teacher/lessons/LessonBuilder'))
const ActivitiesList = lazy(() => import('./pages/teacher/activities/ActivitiesList'))
const ActivityCreator = lazy(() => import('./pages/teacher/activities/ActivityCreator'))
const ContentLibrary = lazy(() => import('./pages/teacher/library/ContentLibrary'))
const CurriculumPlanner = lazy(() => import('./pages/teacher/curriculum/CurriculumPlanner'))
const AssignmentTool = lazy(() => import('./pages/teacher/assignments/AssignmentTool'))
const AssessmentDashboard = lazy(() => import('./pages/teacher/AssessmentDashboard'))
const LiveMonitor = lazy(() => import('./pages/teacher/LiveMonitor'))
const ActivityFeed = lazy(() => import('./pages/shared/ActivityFeed'))
const ItemBankReview = lazy(() => import('./pages/teacher/ItemBankReview'))
const CurriculumBrowser = lazy(() => import('./pages/teacher/CurriculumBrowser'))
const ReportCardBuilder = lazy(() => import('./pages/teacher/ReportCardBuilder'))
const StudentDiscoveryProfile = lazy(() => import('./pages/teacher/StudentDiscoveryProfile'))
const PacingGuidePage = lazy(() => import('./pages/teacher/PacingGuidePage'))
const DiscoveryGamesResults = lazy(() => import('./pages/teacher/DiscoveryGamesResults'))
const TeacherResources = lazy(() => import('./pages/teacher/TeacherResources'))
const SubjectManager = lazy(() => import('./pages/teacher/SubjectManager'))
const ParentDashboard = lazy(() => import('./pages/parent/Dashboard'))
const ParentBillingPage = lazy(() => import('./pages/parent/Billing'))
const EnrollPage = lazy(() => import('./pages/parent/Enroll'))
const GrowthTimeline = lazy(() => import('./pages/parent/GrowthTimeline'))
const AssessmentSummary = lazy(() => import('./pages/parent/AssessmentSummary'))
const ParentOrientation = lazy(() => import('./pages/parent/ParentOrientation'))
const ParentLetters = lazy(() => import('./pages/parent/ParentLetters'))
const ParentCurriculum = lazy(() => import('./pages/parent/ParentCurriculum'))
const FlightPlan = lazy(() => import('./pages/student/FlightPlan'))
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const SkillPractice = lazy(() => import('./pages/student/SkillPractice'))
const StudentSubjects = lazy(() => import('./pages/student/StudentSubjects'))
const StudentProgress = lazy(() => import('./pages/student/StudentProgress'))
const StudentAchievements = lazy(() => import('./pages/student/StudentAchievements'))
const ActivityPlayer = lazy(() => import('./pages/student/activity-player/ActivityPlayer'))
const AssessmentPlayer = lazy(() => import('./pages/student/AssessmentPlayer'))
const OrientationWizard = lazy(() => import('./pages/student/OrientationWizard'))
const StudentWelcome = lazy(() => import('./pages/student/StudentWelcome'))
const WarmActivities = lazy(() => import('./pages/student/WarmActivities'))
const StudentLibrary = lazy(() => import('./pages/student/StudentLibrary'))
const RewardShop = lazy(() => import('./pages/student/RewardShop'))
const LearningPathPage = lazy(() => import('./pages/student/LearningPathPage'))
const GameLauncher = lazy(() => import('./pages/student/games/GameLauncher'))
const DataExplorerPage = lazy(() => import('./components/student/DataExplorer'))
const UnifiedReportCard = lazy(() => import('./pages/shared/UnifiedReportCard'))
const Inbox = lazy(() => import('./pages/shared/Inbox'))
const OrganizationIntake = lazy(() => import('./pages/admin/OrganizationIntake'))
const MyLocker = lazy(() => import('./pages/student/MyLocker'))
const SessionTimeout = lazy(() => import('./components/shared/SessionTimeout'))








function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner size="lg" />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

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
        <Route path="admin/subjects" element={<SubjectManager />} />
        <Route path="admin/reports" element={<AdminDashboard />} />
        <Route path="admin/api-settings" element={<ApiSettings />} />
        <Route path="admin/report-card" element={<UnifiedReportCard />} />
        <Route path="admin/organizations" element={<OrganizationIntake />} />
        <Route path="admin/messages" element={<Inbox />} />
        <Route path="admin/live-monitor" element={<LiveMonitor />} />

        {/* Teacher Routes */}
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="teacher/mission-control" element={<MissionControl />} />
        <Route path="teacher/students" element={<TeacherDashboard />} />
        <Route path="teacher/schedule" element={<TeacherDashboard />} />
        <Route path="teacher/mastery" element={<TeacherDashboard />} />
        <Route path="teacher/skill-map" element={<SkillMap />} />
        <Route path="teacher/assessments" element={<AssessmentDashboard />} />
        <Route path="teacher/live-monitor" element={<LiveMonitor />} />
        <Route path="teacher/item-bank" element={<ItemBankReview />} />
        <Route path="teacher/discovery-results" element={<DiscoveryGamesResults />} />
        <Route path="teacher/lessons" element={<LessonsList />} />
        <Route path="teacher/lessons/new" element={<LessonBuilder />} />
        <Route path="teacher/lessons/:id" element={<LessonBuilder />} />
        <Route path="teacher/activities" element={<ActivitiesList />} />
        <Route path="teacher/activities/new" element={<ActivityCreator />} />
        <Route path="teacher/activities/:id" element={<ActivityCreator />} />
        <Route path="teacher/library" element={<ContentLibrary />} />
        <Route path="teacher/curriculum" element={<CurriculumPlanner />} />
        <Route path="teacher/assignments" element={<AssignmentTool />} />
        <Route path="teacher/curriculum-browser" element={<CurriculumBrowser />} />
        <Route path="teacher/report-cards" element={<ReportCardBuilder />} />
        <Route path="teacher/discovery-profile/:studentId" element={<StudentDiscoveryProfile />} />
        <Route path="teacher/pacing-guide" element={<PacingGuidePage />} />
        <Route path="teacher/resources" element={<TeacherResources />} />
        <Route path="teacher/subjects" element={<SubjectManager />} />

        {/* Parent Routes */}
        <Route path="parent" element={<ParentDashboard />} />
        <Route path="parent/orientation" element={<ParentOrientation />} />
        <Route path="parent/progress" element={<ParentDashboard />} />
        <Route path="parent/growth" element={<GrowthTimeline />} />
        <Route path="parent/assessments" element={<AssessmentSummary />} />
        <Route path="parent/curriculum" element={<ParentCurriculum />} />
        <Route path="parent/milestones" element={<ParentDashboard />} />
        <Route path="parent/certificates" element={<ParentDashboard />} />
        <Route path="parent/billing" element={<ParentBillingPage />} />
        <Route path="parent/enroll" element={<EnrollPage />} />
        <Route path="parent/messages" element={<ParentDashboard />} />
        <Route path="parent/letters" element={<ParentLetters />} />
        <Route path="parent/report-card" element={<UnifiedReportCard />} />
        <Route path="parent/messages" element={<Inbox />} />

        {/* Student Routes */}
        <Route path="student" element={<StudentDashboard />} />
        <Route path="student/flight-plan" element={<FlightPlan />} />
        <Route path="student/welcome" element={<StudentWelcome />} />
        <Route path="student/orientation" element={<OrientationWizard />} />
        <Route path="student/activities" element={<WarmActivities />} />
        <Route path="student/assessment" element={<AssessmentPlayer />} />
        <Route path="student/activity/:id" element={<ActivityPlayer />} />
        <Route path="student/practice/:playlistItemId" element={<SkillPractice />} />
        <Route path="student/subjects" element={<StudentSubjects />} />
        <Route path="student/progress" element={<StudentProgress />} />
        <Route path="student/achievements" element={<StudentAchievements />} />
        <Route path="student/library" element={<StudentLibrary />} />
        <Route path="student/reward-shop" element={<RewardShop />} />
        <Route path="student/locker" element={<MyLocker />} />
        <Route path="student/learning-path" element={<LearningPathPage />} />
        <Route path="student/game/:gameType" element={<GameLauncher />} />
        <Route path="student/data-explorer" element={<DataExplorerPage />} />

        {/* Settings */}
        <Route path="settings/delete-account" element={<DeleteAccount />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <SessionTimeout />
    </Suspense>
  )
}
