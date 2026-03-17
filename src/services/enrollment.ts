import { supabase } from './supabase'
import type { EnrollmentType, StudentEnrollment } from '../types'

export const enrollmentService = {
  async getEnrollmentTypes(): Promise<EnrollmentType[]> {
    const { data, error } = await supabase
      .from('enrollment_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) { console.error('getEnrollmentTypes error:', error); return [] }
    return data || []
  },

  async getStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select('*, enrollment_type:enrollment_types(*)')
      .eq('student_id', studentId)
      .order('start_date', { ascending: false })
    if (error) { console.error('getStudentEnrollments error:', error); return [] }
    return data || []
  },

  async getAllEnrollments(): Promise<StudentEnrollment[]> {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select('*, enrollment_type:enrollment_types(*), student:student_profiles(*, profile:profiles!student_profiles_user_id_fkey(*))')
      .order('created_at', { ascending: false })
    if (error) { console.error('getAllEnrollments error:', error); return [] }
    return data || []
  },

  async createEnrollment(enrollment: Partial<StudentEnrollment>): Promise<StudentEnrollment | null> {
    const { data, error } = await supabase
      .from('student_enrollments')
      .insert(enrollment)
      .select('*, enrollment_type:enrollment_types(*)')
      .single()
    if (error) { console.error('createEnrollment error:', error); return null }
    return data
  },

  async updateEnrollmentStatus(enrollmentId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('student_enrollments')
      .update({ status })
      .eq('id', enrollmentId)
    if (error) throw error
  },
}
