import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurriculumResource {
  id: string
  resource_type: string
  code: string | null
  title: string
  subject: string | null
  grade_levels: string[]
  content_markdown: string
  standards: string[]
  audience: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CurriculumFile {
  id: string
  resource_id: string | null
  file_name: string
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  description: string | null
  created_at: string
}

export type ResourceType =
  | 'overview' | 'scope_sequence' | 'lesson_plan' | 'assessment'
  | 'test' | 'worksheet' | 'study_guide' | 'report_card'
  | 'teacher_guide' | 'parent_template' | 'study_plan'

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getCurriculumResources(filters?: {
  resource_type?: ResourceType | ResourceType[]
  subject?: string
  audience?: string | string[]
  grade_level?: string
}) {
  let query = supabase
    .from('curriculum_resources')
    .select('id, resource_type, code, title, subject, grade_levels, standards, audience, sort_order, created_at')

  if (filters?.resource_type) {
    if (Array.isArray(filters.resource_type)) {
      query = query.in('resource_type', filters.resource_type)
    } else {
      query = query.eq('resource_type', filters.resource_type)
    }
  }
  if (filters?.subject) query = query.eq('subject', filters.subject)
  if (filters?.audience) {
    if (Array.isArray(filters.audience)) {
      query = query.in('audience', filters.audience)
    } else {
      query = query.or(`audience.eq.${filters.audience},audience.eq.all`)
    }
  }
  if (filters?.grade_level) query = query.contains('grade_levels', [filters.grade_level])

  query = query.order('sort_order')
  const { data, error } = await query
  if (error) throw error
  return data as Omit<CurriculumResource, 'content_markdown'>[]
}

export async function getCurriculumResource(id: string) {
  const { data, error } = await supabase
    .from('curriculum_resources')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as CurriculumResource
}

export async function getCurriculumFiles(resourceId?: string) {
  let query = supabase.from('curriculum_files').select('*')
  if (resourceId) query = query.eq('resource_id', resourceId)
  query = query.order('file_name')
  const { data, error } = await query
  if (error) throw error
  return data as CurriculumFile[]
}

export async function getAllDownloadableFiles() {
  const { data, error } = await supabase
    .from('curriculum_files')
    .select('*')
    .order('file_name')
  if (error) throw error
  return data as CurriculumFile[]
}

export function getFileDownloadUrl(storagePath: string) {
  const { data } = supabase.storage
    .from('curriculum-files')
    .getPublicUrl(storagePath.replace('curriculum-files/', ''))
  return data.publicUrl
}

// ─── Label Helpers ───────────────────────────────────────────────────────────

export const resourceTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  overview: { label: 'Program Overview', icon: '🎯', color: 'bg-blue-100 text-blue-800' },
  scope_sequence: { label: 'Scope & Sequence', icon: '📋', color: 'bg-indigo-100 text-indigo-800' },
  lesson_plan: { label: 'Lesson Plan', icon: '📖', color: 'bg-emerald-100 text-emerald-800' },
  assessment: { label: 'Assessment', icon: '📝', color: 'bg-amber-100 text-amber-800' },
  test: { label: 'Test', icon: '✏️', color: 'bg-red-100 text-red-800' },
  worksheet: { label: 'Worksheet', icon: '📄', color: 'bg-purple-100 text-purple-800' },
  study_guide: { label: 'Study Guide', icon: '📚', color: 'bg-cyan-100 text-cyan-800' },
  report_card: { label: 'Report Card', icon: '📊', color: 'bg-orange-100 text-orange-800' },
  teacher_guide: { label: 'Teacher Guide', icon: '🧑‍🏫', color: 'bg-teal-100 text-teal-800' },
  parent_template: { label: 'Parent Letter', icon: '✉️', color: 'bg-pink-100 text-pink-800' },
  study_plan: { label: 'Study Plan', icon: '📅', color: 'bg-lime-100 text-lime-800' },
}

export const subjectLabels: Record<string, { label: string; icon: string }> = {
  literacy: { label: 'Literacy', icon: '📖' },
  math: { label: 'Mathematics', icon: '🔢' },
  daily_living: { label: 'Daily Living', icon: '🏠' },
  sel: { label: 'Social-Emotional', icon: '❤️' },
  science: { label: 'Science', icon: '🔬' },
  social_studies: { label: 'Social Studies', icon: '🌍' },
  creative_arts: { label: 'Creative Arts', icon: '🎨' },
  general: { label: 'General', icon: '📌' },
}

export const gradeLevelLabels: Record<string, string> = {
  'pre-k': 'Pre-K',
  'k': 'Kindergarten',
  '1': 'Grade 1',
  '2': 'Grade 2',
  '3': 'Grade 3',
  '4': 'Grade 4',
}
