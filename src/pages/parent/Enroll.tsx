import { useState, useEffect } from 'react'
import { Header } from '../../components/layout'
import { EnrollmentWizard } from '../../components/billing'
import { LoadingSpinner } from '../../components/common'
import { studentService } from '../../services/students'
import { useAuth } from '../../hooks'
import type { StudentProfile } from '../../types'

export default function EnrollPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    studentService.getStudentsByParent(user.id).then((data) => {
      setStudents(data)
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="📋 Enroll Your Child" subtitle="Choose a plan and get started" />
      <div className="p-6 max-w-3xl mx-auto">
        <EnrollmentWizard students={students} parentId={user!.id} />
      </div>
    </div>
  )
}
