import { supabase } from './supabase'
import type { StudentMastery, Assessment } from '../types'

export const masteryService = {
  async getStudentMastery(studentId: string): Promise<StudentMastery[]> {
    const { data, error } = await supabase
      .from('student_mastery')
      .select('*, standard:learning_standards(*, subject:subjects(*))')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
    if (error) { console.error('getStudentMastery error:', error); return [] }
    return data || []
  },

  async getRecentAchievements(studentId: string, limit = 5): Promise<StudentMastery[]> {
    const { data, error } = await supabase
      .from('student_mastery')
      .select('*, standard:learning_standards(*, subject:subjects(*))')
      .eq('student_id', studentId)
      .eq('is_mastered', true)
      .order('mastered_at', { ascending: false })
      .limit(limit)
    if (error) { console.error('getRecentAchievements error:', error); return [] }
    return data || []
  },

  async recordAssessment(assessment: Partial<Assessment>): Promise<Assessment | null> {
    const { data, error } = await supabase
      .from('assessments')
      .insert(assessment)
      .select()
      .single()
    if (error) { console.error('recordAssessment error:', error); return null }
    return data
  },

  async getAssessmentHistory(studentId: string, standardId?: string): Promise<Assessment[]> {
    let query = supabase
      .from('assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    if (standardId) query = query.eq('standard_id', standardId)
    const { data, error } = await query
    if (error) { console.error('getAssessmentHistory error:', error); return [] }
    return data || []
  },
}
