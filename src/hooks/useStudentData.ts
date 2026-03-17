import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { studentService } from '../services/students'
import { flightPlanService } from '../services/flightPlan'
import { masteryService } from '../services/mastery'
import type { StudentProfile, FlightPlanItem, MasterySummary, StudentMastery } from '../types'

export function useStudentData() {
  const { user } = useAuth()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [todaysItems, setTodaysItems] = useState<FlightPlanItem[]>([])
  const [masterySummaries, setMasterySummaries] = useState<MasterySummary[]>([])
  const [achievements, setAchievements] = useState<StudentMastery[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const profile = await studentService.getStudentProfile(user.id)
      setStudent(profile)

      if (profile) {
        const [items, mastery, recent, streakCount] = await Promise.all([
          flightPlanService.getTodaysItems(profile.id),
          studentService.getMasterySummaries(profile.id),
          masteryService.getRecentAchievements(profile.id),
          studentService.getStreak(profile.id),
        ])
        setTodaysItems(items)
        setMasterySummaries(mastery)
        setAchievements(recent)
        setStreak(streakCount)
      }
    } catch (err) {
      console.error('Failed to load student data:', err)
    } finally {
      setLoading(false)
    }
  }

  return { student, todaysItems, masterySummaries, achievements, streak, loading, refresh: loadData }
}
