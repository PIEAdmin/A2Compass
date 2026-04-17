import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScopeSequenceEntry {
  id: string
  domain: string
  grade_level: string
  strand: string
  skill_name: string
  standard_code: string
  description: string
  quarter: number
  prerequisite_skills: string[]
  mastery_criteria: string
  progression_notes: string
}

export interface DevelopmentalBenchmark {
  id: string
  age_range: string
  domain: string
  area: string
  benchmark: string
  assessment_method: string
  typical_range: string
}

export interface AssessmentActivity {
  id: string
  activity_name: string
  type: 'formal' | 'hands_on' | 'observation' | 'game_based'
  domain: string
  grade_range: string
  duration_minutes: number
  materials: string[]
  procedure: string
  scoring_criteria: string
  accommodations: string
}

export interface LessonPlan {
  id: string
  title: string
  domain: string
  grade_level: string
  duration_minutes: number
  ccss_standards: string[]
  objectives: string[]
  materials: string[]
  warm_up: string
  instruction: string
  guided_practice: string
  independent_practice: string
  wrap_up: string
  differentiation: Record<string, string>
  assessment_method: string
}

export interface PrintableMaterial {
  id: string
  title: string
  type: 'worksheet' | 'activity_sheet' | 'game' | 'manipulative' | 'assessment' | 'reference'
  domain: string
  grade_range: string
  skill_target: string
  instructions: string
  page_count: number
  linked_lesson_id: string | null
}

export interface StudyGuide {
  id: string
  title: string
  domain: string
  grade_range: string
  content: string
  key_vocabulary: Record<string, string>[]
  practice_problems: Record<string, string>[]
  parent_tips: string
}

export interface ReportCardConfig {
  id: string
  section_name: string
  category: 'academic' | 'behavioral' | 'social_emotional'
  rating_scale: { min: number; max: number; labels: Record<string, string> }
  indicators: string[]
  has_narrative: boolean
}

export interface StudentReportCard {
  id: string
  student_id: string
  teacher_id: string
  term: string
  school_year: string
  scores: Record<string, Record<string, number>>
  narratives: Record<string, string>
  attendance: { present: number; absent: number; tardy: number }
  created_at: string
  finalized_at: string | null
}

export interface ParentCommTemplate {
  id: string
  template_name: string
  type: 'welcome_letter' | 'progress_snapshot' | 'lightbulb_certificate' | 'term_report'
  subject: string
  body_template: string
  variables: string[]
  design_notes: string
}

export interface PacingGuideEntry {
  id: string
  weeks: string
  phase: string
  domain: string
  topics: string[]
  lesson_ids: string[]
  assessment_checkpoint: string
  notes: string
}

export interface PlacementRule {
  id: string
  domain: string
  assessment_type: string
  score_range: string
  recommended_grade: string
  recommended_level: string
  action: string
  notes: string
}

export interface StudentDiscoveryData {
  learning_style: string | null
  pilot_level: string | null
  discovery_profile: Record<string, unknown> | null
  interests: string[] | null
  strengths: string[] | null
  areas_for_growth: string[] | null
}

// ─── Scope & Sequence ────────────────────────────────────────────────────────

export async function getScopeSequence(filters?: {
  domain?: string
  grade_level?: string
  quarter?: number
}) {
  let query = supabase.from('curriculum_scope_sequence').select('*')
  if (filters?.domain) query = query.eq('domain', filters.domain)
  if (filters?.grade_level) query = query.eq('grade_level', filters.grade_level)
  if (filters?.quarter) query = query.eq('quarter', filters.quarter)
  query = query.order('domain').order('grade_level').order('strand')
  const { data, error } = await query
  if (error) throw error
  return data as ScopeSequenceEntry[]
}

// ─── Developmental Benchmarks ────────────────────────────────────────────────

export async function getBenchmarks(ageRange?: string) {
  let query = supabase.from('developmental_benchmarks').select('*')
  if (ageRange) query = query.eq('age_range', ageRange)
  query = query.order('domain').order('area')
  const { data, error } = await query
  if (error) throw error
  return data as DevelopmentalBenchmark[]
}

// ─── Assessment Activities ───────────────────────────────────────────────────

export async function getAssessmentActivities(filters?: {
  type?: string
  domain?: string
}) {
  let query = supabase.from('assessment_activities').select('*')
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.domain) query = query.eq('domain', filters.domain)
  query = query.order('activity_name')
  const { data, error } = await query
  if (error) throw error
  return data as AssessmentActivity[]
}

// ─── Lesson Plans ────────────────────────────────────────────────────────────

export async function getLessonPlans(filters?: {
  domain?: string
  grade_level?: string
}) {
  let query = supabase.from('lesson_plans').select('*')
  if (filters?.domain) query = query.eq('domain', filters.domain)
  if (filters?.grade_level) query = query.eq('grade_level', filters.grade_level)
  query = query.order('title')
  const { data, error } = await query
  if (error) throw error
  return data as LessonPlan[]
}

// ─── Printable Materials ─────────────────────────────────────────────────────

export async function getPrintableMaterials(filters?: {
  type?: string
  domain?: string
}) {
  let query = supabase.from('printable_materials').select('*')
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.domain) query = query.eq('domain', filters.domain)
  query = query.order('title')
  const { data, error } = await query
  if (error) throw error
  return data as PrintableMaterial[]
}

// ─── Study Guides ────────────────────────────────────────────────────────────

export async function getStudyGuides(filters?: {
  domain?: string
  grade_range?: string
}) {
  let query = supabase.from('study_guides').select('*')
  if (filters?.domain) query = query.eq('domain', filters.domain)
  if (filters?.grade_range) query = query.eq('grade_range', filters.grade_range)
  query = query.order('title')
  const { data, error } = await query
  if (error) throw error
  return data as StudyGuide[]
}

// ─── Report Card Config ──────────────────────────────────────────────────────

export async function getReportCardConfig() {
  const { data, error } = await supabase
    .from('report_card_config')
    .select('*')
    .order('category')
    .order('section_name')
  if (error) throw error
  return data as ReportCardConfig[]
}

// ─── Student Report Cards ────────────────────────────────────────────────────

export async function getStudentReportCards(studentId: string) {
  const { data, error } = await supabase
    .from('student_report_cards')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as StudentReportCard[]
}

export async function getStudentReportCard(studentId: string, term: string, schoolYear: string) {
  const { data, error } = await supabase
    .from('student_report_cards')
    .select('*')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('school_year', schoolYear)
    .maybeSingle()
  if (error) throw error
  return data as StudentReportCard | null
}

export async function createReportCard(data: Omit<StudentReportCard, 'id' | 'created_at' | 'finalized_at'>) {
  const { data: result, error } = await supabase
    .from('student_report_cards')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as StudentReportCard
}

export async function updateReportCard(id: string, data: Partial<StudentReportCard>) {
  const { data: result, error } = await supabase
    .from('student_report_cards')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as StudentReportCard
}

// ─── Parent Communication Templates ──────────────────────────────────────────

export async function getParentTemplates(type?: string) {
  let query = supabase.from('parent_comm_templates').select('*')
  if (type) query = query.eq('type', type)
  query = query.order('template_name')
  const { data, error } = await query
  if (error) throw error
  return data as ParentCommTemplate[]
}

// ─── Pacing Guide ────────────────────────────────────────────────────────────

export async function getPacingGuide() {
  const { data, error } = await supabase
    .from('pacing_guide')
    .select('*')
    .order('weeks')
  if (error) throw error
  return data as PacingGuideEntry[]
}

// ─── Placement Rules ─────────────────────────────────────────────────────────

export async function getPlacementRules(domain?: string) {
  let query = supabase.from('placement_rules').select('*')
  if (domain) query = query.eq('domain', domain)
  query = query.order('domain').order('score_range')
  const { data, error } = await query
  if (error) throw error
  return data as PlacementRule[]
}

// ─── Student Discovery Profile ───────────────────────────────────────────────

export async function getStudentDiscoveryProfile(studentId: string) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('learning_style, pilot_level, discovery_profile, interests, strengths, areas_for_growth')
    .eq('id', studentId)
    .single()
  if (error) throw error
  return data as StudentDiscoveryData
}

export async function updateStudentDiscoveryProfile(
  studentId: string,
  data: Partial<StudentDiscoveryData>
) {
  const { data: result, error } = await supabase
    .from('student_profiles')
    .update(data)
    .eq('id', studentId)
    .select('learning_style, pilot_level, discovery_profile, interests, strengths, areas_for_growth')
    .single()
  if (error) throw error
  return result as StudentDiscoveryData
}

// ─── Assessment Sessions (for placement) ─────────────────────────────────────

export async function getStudentAssessmentSessions(studentId: string) {
  const { data, error } = await supabase
    .from('mini_assessment_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
