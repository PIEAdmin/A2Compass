import { supabase } from './supabase'
import type { StudentProfile, StudentEnrollment, MasterySummary, Subject, MasteryLevel } from '../types'

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

  async getMasterySummaries(studentId: string): Promise<MasterySummary[]> {
    const { data: subjects } = await supabase.from('subjects').select('*').order('name')
    if (!subjects) return []

    const { data: mastery } = await supabase
      .from('student_mastery')
      .select('*, standard:learning_standards(*)')
      .eq('student_id', studentId)

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

  async getStreak(studentId: string): Promise<number> {
    const { data } = await supabase
      .from('flight_plan_items')
      .select('date')
      .eq('student_id', studentId)
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
