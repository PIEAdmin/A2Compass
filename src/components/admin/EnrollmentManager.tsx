import { useState, useEffect } from 'react'
import type { StudentEnrollment } from '../../types'
import { enrollmentService } from '../../services/enrollment'

export default function EnrollmentManager() {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadEnrollments() }, [])

  async function loadEnrollments() {
    setLoading(true)
    const data = await enrollmentService.getAllEnrollments()
    setEnrollments(data)
    setLoading(false)
  }

  if (loading) return <div className="animate-pulse bg-gray-200 rounded-xl h-48" />

  const statusCounts = enrollments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  function getStudentName(enrollment: any): string {
    const profile = enrollment.student?.profile
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim()
    }
    return 'Unknown'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-compass-navy mb-4">📋 Enrollment Management</h3>

      <div className="flex gap-3 mb-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <span key={status} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
            {status}: {count}
          </span>
        ))}
      </div>

      {enrollments.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No enrollments yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 text-gray-600 font-medium">Student</th>
                <th className="py-2 text-gray-600 font-medium">Type</th>
                <th className="py-2 text-gray-600 font-medium">Status</th>
                <th className="py-2 text-gray-600 font-medium">Start Date</th>
                <th className="py-2 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-2">{getStudentName(e)}</td>
                  <td className="py-2">{e.enrollment_type?.name || '-'}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.status === 'active' ? 'bg-green-100 text-green-700' :
                      e.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{e.status}</span>
                  </td>
                  <td className="py-2">{new Date(e.start_date).toLocaleDateString()}</td>
                  <td className="py-2">
                    <button className="text-xs text-compass-blue hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
