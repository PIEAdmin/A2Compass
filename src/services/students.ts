import { supabase } from './supabase'
import type { StudentProfile, StudentEnrollment, MasterySummary, Subject, MasteryLevel } from '../types'

// ─── ID Resolution ───────────────────────────────────────────────────────────
// Many tables reference student_profiles(id) as FK, but the client only has
// the auth UUID (profiles.id / user_id). This helper resolves it.
// Cache to avoid repeated lookups within a session.
const profileIdCache = new Map<string, string>();

export async function getStudentProfileId(authUserId: string): Promise<string | null> {
  if (profileIdCache.has(authUserId)) return profileIdCache.get(authUserId)!;

  const { data, error } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (error || !data) return null;
  profileIdCache.set(authUserId, data.id);
  return data.id;
}

export const studentService = {
  async getStudentProfile(userId: string): Promise<StudentProfile | null> {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`*, tier:tiers(*), profile:profiles!student_profiles_user_id_fkey(*)`)
      .eq('user_id', userId)
      .single()
    if (error) { console.error('getStudentProfile error:', error); return null }
    return data
  },

  async getStudentsByTeacher(teacherId: string): Promise<StudentProfile[]> {
    // For now, teachers see all students. Will filter by assignment later.
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`*, tier:tiers(*), profile:profiles!student_profiles_user_id_fkey(*), enrollments:student_enrollments(*, enrollment_type:enrollment_types(*))`)
      .order('created_at', { ascending: true })
    if (error) { console.error('getStudentsByTeacher error:', error); return [] }
    return data || []
  },

  async getStudentsByParent(parentId: string): Promise<StudentProfile[]> {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`*, tier:tiers(*), profile:profiles!student_profiles_user_id_fkey(*), enrollments:student_enrollments(*, enrollment_type:enrollment_types(*))`)
      .eq('parent_id', parentId)
    if (error) { console.error('getStudentsByParent error:', error); return [] }
    return data || []
  },

  async getAllStudents(): Promise<StudentProfile[]> {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`*, tier:tiers(*), profile:profiles!student_profiles_user_id_fkey(*), enrollments:student_enrollments(*, enrollment_type:enrollment_types(*))`)
      .order('created_at', { ascending: true })
    if (error) { console.error('getAllStudents error:', error); return [] }
    return data || []
  },

  async getMasterySummaries(userId: string): Promise<MasterySummary[]> {
    // student_mastery.student_id FK → student_profiles(id), so resolve first
    const studentProfileId = await getStudentProfileId(userId);
    if (!studentProfileId) return [];

    const { data: subjects } = await supabase.from('subjects').select('*').order('name')
    if (!subjects) return []

    const { data: mastery } = await supabase
      .from('student_mastery')
      .select('*, standard:learning_standards(*)')
      .eq('student_id', studentProfileId)

    return subjects.map((subject: Subject) => {
      const subjectMastery = (mastery || []).filter(
        (m: any) => m.standard?.subject_id === subject.id
      )
      const total = subjectMastery.length || 1
      const mastered = subjectMastery.filter((m: any) => m.is_mastered).length
      const avgPct = subjectMastery.length > 0
        ? subjectMastery.reduce((sum: number, m: any) => sum + m.mastery_percentage, 0) / total
        : 0

      let level: MasteryLevel = 'not_started'
      if (avgPct >= 85) level = 'mastered'
      else if (avgPct >= 60) level = 'approaching'
      else if (avgPct > 0) level = 'developing'

      return { subject, currentPercentage: Math.round(avgPct), standardsTotal: total, standardsMastered: mastered, level }
    })
  },

  async getStreak(userId: string): Promise<number> {
    // flight_plan_items.student_id FK → student_profiles(id), so resolve first
    const studentProfileId = await getStudentProfileId(userId);
    if (!studentProfileId) return 0;

    const { data } = await supabase
      .from('flight_plan_items')
      .select('date')
      .eq('student_id', studentProfileId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(30)
    if (!data || data.length === 0) return 0

    let streak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      if (data.some((d: any) => d.date === dateStr)) {
        streak++
      } else if (i > 0) break
    }
    return streak
  },
}
