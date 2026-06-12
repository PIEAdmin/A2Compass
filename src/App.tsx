import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from './store'
import { initAuth } from './store/authSlice'
import { useAuth } from './hooks'
import { DashboardLayout } from './components/layout'
import { LoadingSpinner } from './components/common'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DemoLogin = lazy(() => import('./pages/auth/DemoLogin'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const DeleteAccount = lazy(() => import('./pages/settings/DeleteAccount'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminStudents = lazy(() => import('./pages/admin/Students'))
const AdminEnrollment = lazy(() => import('./pages/admin/Enrollment'))
const AdminReports = lazy(() => import('./pages/admin/Reports'))
const AdminBillingPage = lazy(() => import('./pages/admin/Billing'))
const ApiSettings = lazy(() => import('./pages/admin/ApiSettings'))
const ComingSoon = lazy(() => import('./pages/shared/ComingSoon'))
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
const PlayMode = lazy(() => import('./pages/student/PlayMode'))
const FreePlay = lazy(() => import('./pages/student/FreePlay'))
const VideoLibrary = lazy(() => import('./pages/student/VideoLibrary'))
const InteractiveStory = lazy(() => import('./pages/student/InteractiveStory'))
const BalloonPopDemo = lazy(() => import('./pages/student/games/BalloonPopDemo'))
const SpanishVillage = lazy(() => import('./pages/student/SpanishVillage'))
const SessionTimeout = lazy(() => import('./components/shared/SessionTimeout'))
const AdminBulletinBoard = lazy(() => import('./pages/admin/AdminBulletinBoard'))
const KudosManager = lazy(() => import('./pages/admin/KudosManager'))
const ParentBulletinBoard = lazy(() => import('./pages/parent/ParentBulletinBoard'))
const ParentKudosPage = lazy(() => import('./pages/parent/KudosPage'))
const RoleGuard = lazy(() => import('./components/shared/RoleGuard'))

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
      <Route path="/demo" element={<DemoLogin />} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<RoleRedirect />} />

        {/* ═══ Admin Routes (admin only) ═══ */}
        <Route path="admin" element={<RoleGuard allowed={['admin']}><AdminDashboard /></RoleGuard>} />
        <Route path="admin/students" element={<RoleGuard allowed={['admin']}><AdminStudents /></RoleGuard>} />
        <Route path="admin/enrollment" element={<RoleGuard allowed={['admin']}><AdminEnrollment /></RoleGuard>} />
        <Route path="admin/billing" element={<RoleGuard allowed={['admin']}><AdminBillingPage /></RoleGuard>} />
        <Route path="admin/subjects" element={<RoleGuard allowed={['admin']}><SubjectManager /></RoleGuard>} />
        <Route path="admin/reports" element={<RoleGuard allowed={['admin']}><AdminReports /></RoleGuard>} />
        <Route path="admin/api-settings" element={<RoleGuard allowed={['admin']}><ApiSettings /></RoleGuard>} />
        <Route path="admin/report-card" element={<RoleGuard allowed={['admin']}><UnifiedReportCard /></RoleGuard>} />
        <Route path="admin/organizations" element={<RoleGuard allowed={['admin']}><OrganizationIntake /></RoleGuard>} />
        <Route path="admin/messages" element={<RoleGuard allowed={['admin']}><Inbox /></RoleGuard>} />
        <Route path="admin/bulletin-board" element={<RoleGuard allowed={['admin']}><AdminBulletinBoard /></RoleGuard>} />
        <Route path="admin/kudos" element={<RoleGuard allowed={['admin']}><KudosManager /></RoleGuard>} />
        <Route path="admin/live-monitor" element={<RoleGuard allowed={['admin']}><LiveMonitor /></RoleGuard>} />

        {/* ═══ Teacher Routes (admin + teacher) ═══ */}
        <Route path="teacher" element={<RoleGuard allowed={['admin', 'teacher']}><TeacherDashboard /></RoleGuard>} />
        <Route path="teacher/mission-control" element={<RoleGuard allowed={['admin', 'teacher']}><MissionControl /></RoleGuard>} />
        <Route path="teacher/students" element={<RoleGuard allowed={['admin', 'teacher']}><ComingSoon title="My Students" description="Student management coming soon." /></RoleGuard>} />
        <Route path="teacher/schedule" element={<RoleGuard allowed={['admin', 'teacher']}><ComingSoon title="Schedule" description="Class scheduling coming soon." /></RoleGuard>} />
        <Route path="teacher/mastery" element={<RoleGuard allowed={['admin', 'teacher']}><ComingSoon title="Mastery Tracker" description="Mastery tracking coming soon." /></RoleGuard>} />
        <Route path="teacher/skill-map" element={<RoleGuard allowed={['admin', 'teacher']}><SkillMap /></RoleGuard>} />
        <Route path="teacher/assessments" element={<RoleGuard allowed={['admin', 'teacher']}><AssessmentDashboard /></RoleGuard>} />
        <Route path="teacher/live-monitor" element={<RoleGuard allowed={['admin', 'teacher']}><LiveMonitor /></RoleGuard>} />
        <Route path="teacher/item-bank" element={<RoleGuard allowed={['admin', 'teacher']}><ItemBankReview /></RoleGuard>} />
        <Route path="teacher/discovery-results" element={<RoleGuard allowed={['admin', 'teacher']}><DiscoveryGamesResults /></RoleGuard>} />
        <Route path="teacher/lessons" element={<RoleGuard allowed={['admin', 'teacher']}><LessonsList /></RoleGuard>} />
        <Route path="teacher/lessons/new" element={<RoleGuard allowed={['admin', 'teacher']}><LessonBuilder /></RoleGuard>} />
        <Route path="teacher/lessons/:id" element={<RoleGuard allowed={['admin', 'teacher']}><LessonBuilder /></RoleGuard>} />
        <Route path="teacher/activities" element={<RoleGuard allowed={['admin', 'teacher']}><ActivitiesList /></RoleGuard>} />
        <Route path="teacher/activities/new" element={<RoleGuard allowed={['admin', 'teacher']}><ActivityCreator /></RoleGuard>} />
        <Route path="teacher/activities/:id" element={<RoleGuard allowed={['admin', 'teacher']}><ActivityCreator /></RoleGuard>} />
        <Route path="teacher/library" element={<RoleGuard allowed={['admin', 'teacher']}><ContentLibrary /></RoleGuard>} />
        <Route path="teacher/curriculum" element={<RoleGuard allowed={['admin', 'teacher']}><CurriculumPlanner /></RoleGuard>} />
        <Route path="teacher/assignments" element={<RoleGuard allowed={['admin', 'teacher']}><AssignmentTool /></RoleGuard>} />
        <Route path="teacher/curriculum-browser" element={<RoleGuard allowed={['admin', 'teacher']}><CurriculumBrowser /></RoleGuard>} />
        <Route path="teacher/report-cards" element={<RoleGuard allowed={['admin', 'teacher']}><ReportCardBuilder /></RoleGuard>} />
        <Route path="teacher/discovery-profile/:studentId" element={<RoleGuard allowed={['admin', 'teacher']}><StudentDiscoveryProfile /></RoleGuard>} />
        <Route path="teacher/pacing-guide" element={<RoleGuard allowed={['admin', 'teacher']}><PacingGuidePage /></RoleGuard>} />
        <Route path="teacher/resources" element={<RoleGuard allowed={['admin', 'teacher']}><TeacherResources /></RoleGuard>} />
        <Route path="teacher/subjects" element={<RoleGuard allowed={['admin', 'teacher']}><SubjectManager /></RoleGuard>} />
        <Route path="teacher/messages" element={<RoleGuard allowed={['admin', 'teacher']}><Inbox /></RoleGuard>} />
        <Route path="teacher/activity" element={<RoleGuard allowed={['admin', 'teacher']}><ActivityFeed /></RoleGuard>} />

        {/* ═══ Parent Routes (admin + parent) ═══ */}
        <Route path="parent" element={<RoleGuard allowed={['admin', 'parent']}><ParentDashboard /></RoleGuard>} />
        <Route path="parent/orientation" element={<RoleGuard allowed={['admin', 'parent']}><ParentOrientation /></RoleGuard>} />
        <Route path="parent/progress" element={<RoleGuard allowed={['admin', 'parent']}><ComingSoon title="Progress" description="Detailed progress view coming soon." /></RoleGuard>} />
        <Route path="parent/growth" element={<RoleGuard allowed={['admin', 'parent']}><GrowthTimeline /></RoleGuard>} />
        <Route path="parent/assessments" element={<RoleGuard allowed={['admin', 'parent']}><AssessmentSummary /></RoleGuard>} />
        <Route path="parent/curriculum" element={<RoleGuard allowed={['admin', 'parent']}><ParentCurriculum /></RoleGuard>} />
        <Route path="parent/milestones" element={<RoleGuard allowed={['admin', 'parent']}><ComingSoon title="Milestones" description="Milestone tracking coming soon." /></RoleGuard>} />
        <Route path="parent/certificates" element={<RoleGuard allowed={['admin', 'parent']}><ComingSoon title="Certificates" description="Certificate gallery coming soon." /></RoleGuard>} />
        <Route path="parent/billing" element={<RoleGuard allowed={['admin', 'parent']}><ParentBillingPage /></RoleGuard>} />
        <Route path="parent/enroll" element={<RoleGuard allowed={['admin', 'parent']}><EnrollPage /></RoleGuard>} />
        <Route path="parent/letters" element={<RoleGuard allowed={['admin', 'parent']}><ParentLetters /></RoleGuard>} />
        <Route path="parent/bulletin-board" element={<RoleGuard allowed={['admin', 'parent']}><ParentBulletinBoard /></RoleGuard>} />
        <Route path="parent/kudos" element={<RoleGuard allowed={['admin', 'parent']}><ParentKudosPage /></RoleGuard>} />
        <Route path="parent/report-card" element={<RoleGuard allowed={['admin', 'parent']}><UnifiedReportCard /></RoleGuard>} />
        <Route path="parent/messages" element={<RoleGuard allowed={['admin', 'parent']}><Inbox /></RoleGuard>} />

        {/* ═══ Student Routes (student only — admin can view teacher/parent but not student) ═══ */}
        <Route path="student" element={<RoleGuard allowed={['student']}><StudentDashboard /></RoleGuard>} />
        <Route path="student/flight-plan" element={<RoleGuard allowed={['student']}><FlightPlan /></RoleGuard>} />
        <Route path="student/welcome" element={<RoleGuard allowed={['student']}><StudentWelcome /></RoleGuard>} />
        <Route path="student/orientation" element={<RoleGuard allowed={['student']}><OrientationWizard /></RoleGuard>} />
        <Route path="student/activities" element={<RoleGuard allowed={['student']}><WarmActivities /></RoleGuard>} />
        <Route path="student/assessment" element={<RoleGuard allowed={['student']}><AssessmentPlayer /></RoleGuard>} />
        <Route path="student/activity/:id" element={<RoleGuard allowed={['student']}><ActivityPlayer /></RoleGuard>} />
        <Route path="student/practice/:playlistItemId" element={<RoleGuard allowed={['student']}><SkillPractice /></RoleGuard>} />
        <Route path="student/subjects" element={<RoleGuard allowed={['student']}><StudentSubjects /></RoleGuard>} />
        <Route path="student/progress" element={<RoleGuard allowed={['student']}><StudentProgress /></RoleGuard>} />
        <Route path="student/achievements" element={<RoleGuard allowed={['student']}><StudentAchievements /></RoleGuard>} />
        <Route path="student/library" element={<RoleGuard allowed={['student']}><StudentLibrary /></RoleGuard>} />
        <Route path="student/reward-shop" element={<RoleGuard allowed={['student']}><RewardShop /></RoleGuard>} />
        <Route path="student/locker" element={<RoleGuard allowed={['student']}><MyLocker /></RoleGuard>} />
        <Route path="student/messages" element={<RoleGuard allowed={['student']}><Inbox /></RoleGuard>} />
        <Route path="student/learning-path" element={<RoleGuard allowed={['student']}><LearningPathPage /></RoleGuard>} />
        <Route path="student/game/:gameType" element={<RoleGuard allowed={['student']}><GameLauncher /></RoleGuard>} />
        <Route path="student/data-explorer" element={<RoleGuard allowed={['student']}><DataExplorerPage /></RoleGuard>} />
        <Route path="student/play" element={<RoleGuard allowed={['student']}><PlayMode /></RoleGuard>} />
        <Route path="student/free-play" element={<RoleGuard allowed={['student']}><FreePlay /></RoleGuard>} />
        <Route path="student/videos" element={<RoleGuard allowed={['student']}><VideoLibrary /></RoleGuard>} />
        <Route path="student/story" element={<RoleGuard allowed={['student']}><InteractiveStory /></RoleGuard>} />
        <Route path="student/game/balloon-pop-demo" element={<RoleGuard allowed={['student']}><BalloonPopDemo /></RoleGuard>} />
        <Route path="student/spanish-village" element={<RoleGuard allowed={['student']}><SpanishVillage /></RoleGuard>} />

        {/* Settings */}
        <Route path="settings/delete-account" element={<DeleteAccount />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <SessionTimeout />
    </Suspense>
  )
}
