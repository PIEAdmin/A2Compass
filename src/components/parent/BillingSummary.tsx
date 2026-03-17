import type { StudentEnrollment } from '../../types'
import { EmptyState } from '../common'

interface Props {
  enrollments: StudentEnrollment[]
}

export default function BillingSummary({ enrollments }: Props) {
  const active = enrollments.filter(e => e.status === 'active' || e.status === 'trial')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-compass-navy mb-4">💳 Billing Summary</h3>

      {active.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No active subscriptions"
          description="Enroll your child to get started with A² Compass"
        />
      ) : (
        <div className="space-y-3">
          {active.map((enrollment) => (
            <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-800">
                  {enrollment.enrollment_type?.name || 'Enrollment'}
                </p>
                <p className="text-xs text-gray-500">
                  Since {new Date(enrollment.start_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                enrollment.status === 'active' ? 'bg-green-100 text-green-700' :
                enrollment.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {enrollment.status}
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">Full billing management coming soon</p>
        </div>
      )}
    </div>
  )
}
