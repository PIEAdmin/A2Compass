import type { StudentProfile, MasterySummary, FlightPlanItem } from '../../types'
import type { TierSlug } from '../../types'
import { TierBadge, MasteryBar } from '../common'

interface Props {
  student: StudentProfile
  masterySummaries: MasterySummary[]
  recentActivity: FlightPlanItem[]
  streak: number
}

export default function ChildProgressCard({ student, masterySummaries, recentActivity, streak }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-compass-blue/10 flex items-center justify-center text-lg font-medium text-compass-blue">
          {student.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <h3 className="font-semibold text-compass-navy">{student.profile?.full_name || 'Student'}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500">Grade {student.grade_level}</span>
            {student.tier && <TierBadge tier={student.tier.slug as TierSlug} size="sm" />}
          </div>
        </div>
        {streak > 0 && (
          <div className="ml-auto text-sm">
            🔥 <span className="font-medium text-orange-600">{streak} day streak</span>
          </div>
        )}
      </div>

      {student.enrollments?.[0] && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">
              {student.enrollments[0].enrollment_type?.name || 'Enrolled'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              student.enrollments[0].status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {student.enrollments[0].status}
            </span>
          </div>
        </div>
      )}

      <h4 className="text-sm font-medium text-gray-700 mb-3">Subject Progress</h4>
      {masterySummaries.length === 0 ? (
        <p className="text-gray-500 text-sm">No mastery data yet</p>
      ) : (
        <div className="space-y-3">
          {masterySummaries.map((s) => (
            <MasteryBar
              key={s.subject.id}
              percentage={s.currentPercentage}
              label={`${s.subject.icon} ${s.subject.name}`}
              color={s.subject.color}
            />
          ))}
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
          <div className="space-y-1">
            {recentActivity.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.title}</span>
                <span className={`text-xs ${item.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.status === 'completed' ? '✅' : '⏳'} {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
