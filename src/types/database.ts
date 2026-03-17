// A² Compass — Database Types (matches Supabase schema)

export type TierSlug = 'explorers-camp' | 'scholars-guild' | 'the-collegium'
export type UserRole = 'admin' | 'teacher' | 'parent' | 'student'
export type EnrollmentSlug = 'full-time' | 'tutoring' | 'summer-program' | 'a-la-carte'
export type EnrollmentStatus = 'active' | 'pending_payment' | 'paused' | 'cancelled' | 'trial' | 'scholarship'
export type LearningFormatSlug = 'live-seminar' | 'discussion-board' | 'choice-board' | 'independent-project' | 'partner-quest' | 'one-on-one-coaching' | 'practice-arena'
export type SubjectSlug = 'math' | 'reading-ela' | 'science' | 'social-studies' | 'foreign-language' | 'creative-arts'
export type FlightPlanStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type MasteryLevel = 'not_started' | 'developing' | 'approaching' | 'mastered'

export interface TierThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgGradient: string
  icon: string
  fontStyle: 'playful' | 'balanced' | 'professional'
}

export interface Tier {
  id: string
  name: string
  slug: TierSlug
  grade_range_start: number
  grade_range_end: number
  description: string
  theme_config: TierThemeConfig
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  grade_level: number
  tier_id: string
  date_of_birth: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
  tier?: Tier
  profile?: Profile
  enrollments?: StudentEnrollment[]
}

export interface Subject {
  id: string
  name: string
  slug: SubjectSlug
  description: string
  icon: string
  color: string
  created_at: string
}

export interface EnrollmentType {
  id: string
  name: string
  slug: EnrollmentSlug
  description: string
  schedule_type: string
  is_active: boolean
  created_at: string
}

export interface StudentEnrollment {
  id: string
  student_id: string
  enrollment_type_id: string
  status: EnrollmentStatus
  start_date: string
  end_date: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
  enrollment_type?: EnrollmentType
  student?: StudentProfile
}

export interface LearningStandard {
  id: string
  subject_id: string
  tier_id: string
  code: string
  description: string
  parent_standard_id: string | null
  sort_order: number
  created_at: string
}

export interface StudentMastery {
  id: string
  student_id: string
  standard_id: string
  mastery_percentage: number
  attempts: number
  is_mastered: boolean
  mastered_at: string | null
  created_at: string
  updated_at: string
  standard?: LearningStandard
}

export interface Assessment {
  id: string
  student_id: string
  standard_id: string
  score: number
  max_score: number
  percentage: number
  assessment_type: string
  notes: string | null
  assessed_by: string | null
  created_at: string
}

export interface FlightPlanItem {
  id: string
  student_id: string
  date: string
  title: string
  description: string | null
  subject_id: string | null
  learning_format: LearningFormatSlug | null
  status: FlightPlanStatus
  sort_order: number
  estimated_minutes: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
  subject?: Subject
}

export interface LearningFormat {
  id: string
  name: string
  slug: LearningFormatSlug
  description: string
  icon: string
  created_at: string
}

export interface MasterySummary {
  subject: Subject
  currentPercentage: number
  standardsTotal: number
  standardsMastered: number
  level: MasteryLevel
}

export interface StudentDashboardData {
  student: StudentProfile
  todaysItems: FlightPlanItem[]
  masterySummaries: MasterySummary[]
  recentAchievements: StudentMastery[]
  streak: number
}

export interface TeacherAlert {
  type: 'falling_behind' | 'inactive' | 'mastery_achieved' | 'needs_attention'
  studentId: string
  studentName: string
  message: string
  severity: 'info' | 'warning' | 'success'
}

export interface ParentChildSummary {
  student: StudentProfile
  enrollment: StudentEnrollment | null
  masterySummaries: MasterySummary[]
  recentActivity: FlightPlanItem[]
  streak: number
}
