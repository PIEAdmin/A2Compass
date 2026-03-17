import { supabase } from './supabase'
import type { FlightPlanItem, FlightPlanStatus } from '../types'

export const flightPlanService = {
  async getTodaysItems(studentId: string): Promise<FlightPlanItem[]> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('flight_plan_items')
      .select('*, subject:subjects(*)')
      .eq('student_id', studentId)
      .eq('date', today)
      .order('sort_order')
    if (error) { console.error('getTodaysItems error:', error); return [] }
    return data || []
  },

  async updateItemStatus(itemId: string, status: FlightPlanStatus): Promise<void> {
    const updates: any = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('flight_plan_items').update(updates).eq('id', itemId)
    if (error) throw error
  },

  async getItemsByDateRange(studentId: string, startDate: string, endDate: string): Promise<FlightPlanItem[]> {
    const { data, error } = await supabase
      .from('flight_plan_items')
      .select('*, subject:subjects(*)')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('sort_order')
    if (error) { console.error('getItemsByDateRange error:', error); return [] }
    return data || []
  },

  async createItem(item: Partial<FlightPlanItem>): Promise<FlightPlanItem | null> {
    const { data, error } = await supabase
      .from('flight_plan_items')
      .insert(item)
      .select('*, subject:subjects(*)')
      .single()
    if (error) { console.error('createItem error:', error); return null }
    return data
  },
}
