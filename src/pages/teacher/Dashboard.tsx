import { useState, useEffect } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import { ClassRoster, ProgressMonitor, DailySchedule, ActionBar } from '../../components/teacher'
import { studentService } from '../../services/students'
import { useAuth } from '../../hooks'
import type { StudentProfile } from '../../types'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadStudents()
  }, [user])

  async function loadStudents() {
    setLoading(true)
    const data = await studentService.getStudentsByTeacher(user!.id)
    setStudents(data)
    setLoading(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="🎯 Mission Control" subtitle={`Welcome back, ${user?.fullName?.split(' ')[0] || 'Teacher'}`}>
        <ActionBar />
      </Header>
      <div className="p-6 space-y-6">
        <ProgressMonitor students={students} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ClassRoster students={students} />
          </div>
          <div>
            <DailySchedule />
          </div>
        </div>
      </div>
    </div>
  )
}
