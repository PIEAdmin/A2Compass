import BulletinBoard from '../../components/shared/BulletinBoard'
import KudosTrends from '../../components/parent/KudosTrends'
import { useState, useEffect } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import { ChildProgressCard, BillingSummary } from '../../components/parent'
import CoppaConsentBanner from '../../components/coppa/CoppaConsentBanner'
import { studentService } from '../../services/students'
import { flightPlanService } from '../../services/flightPlan'
import { enrollmentService } from '../../services/enrollment'
import { useAuth } from '../../hooks'
import type { StudentProfile, MasterySummary, FlightPlanItem, StudentEnrollment } from '../../types'

interface ChildData {
  student: StudentProfile
  mastery: MasterySummary[]
  recentActivity: FlightPlanItem[]
  streak: number
  enrollments: StudentEnrollment[]
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const [children, setChildren] = useState<ChildData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadChildren()
  }, [user])

  async function loadChildren() {
    setLoading(true)
    try {
      const students = await studentService.getStudentsByParent(user!.id)

      const childDataPromises = students.map(async (student) => {
        const today = new Date().toISOString().split('T')[0]
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const [mastery, recentActivity, streak, enrollments] = await Promise.all([
          studentService.getMasterySummaries(student.id),
          flightPlanService.getItemsByDateRange(student.id, weekAgo, today),
          studentService.getStreak(student.id),
          enrollmentService.getStudentEnrollments(student.id),
        ])
        return { student, mastery, recentActivity, streak, enrollments }
      })

      setChildren(await Promise.all(childDataPromises))
    } catch (err) {
      console.error('Failed to load children:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" />

  const allEnrollments = children.flatMap(c => c.enrollments)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="🏠 Family Hub" subtitle={`Welcome, ${user?.fullName?.split(' ')[0] || 'Parent'}`} />
      <div className="p-6 space-y-6">
        {/* COPPA Consent Banner - shows only if consent is needed */}
        <CoppaConsentBanner />

        {children.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No children enrolled yet</h3>
            <p className="text-gray-500 text-sm">Contact your teacher to add your children to A² Compass</p>
          </div>
        ) : (
          <>
          {/* Bulletin Board */}
          <BulletinBoard role="parent" studentProfileId={children[0]?.student?.id} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {children.map((child) => (
                <ChildProgressCard
                  key={child.student.id}
                  student={child.student}
                  masterySummaries={child.mastery}
                  recentActivity={child.recentActivity}
                  streak={child.streak}
                />
              ))}
            </div>
            <div>
              <BillingSummary enrollments={allEnrollments} />
              {children.map((child) => {
                const profile = child.student.profile || (child.student as any).profiles;
                const name = profile ? `${profile.first_name} ${profile.last_name}` : "Student";
                return (
                  <KudosTrends
                    key={"kudos-" + child.student.id}
                    studentProfileId={child.student.id}
                    studentName={name}
                  />
                );
              })}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
