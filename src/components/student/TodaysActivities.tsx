import type { FlightPlanItem, FlightPlanStatus } from '../../types'
import { FORMAT_CONFIG } from '../../constants'
import { SUBJECT_CONFIG } from '../../constants'
import { EmptyState } from '../common'

interface Props {
  items: FlightPlanItem[]
  onStatusChange?: (itemId: string, status: FlightPlanStatus) => void
}

const statusConfig: Record<FlightPlanStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  skipped: { label: 'Skipped', color: 'text-yellow-600', bg: 'bg-yellow-100' },
}

export default function TodaysActivities({ items, onStatusChange }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-compass-navy mb-4">📋 Today's Activities</h3>
        <EmptyState
          icon="🎒"
          title="No activities today"
          description="Your teacher hasn't assigned activities yet. Check back soon!"
        />
      </div>
    )
  }

  const completed = items.filter(i => i.status === 'completed').length
  const total = items.length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-compass-navy">📋 Today's Activities</h3>
        <span className="text-sm text-gray-500">{completed}/{total} done</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const status = statusConfig[item.status]
          const subjectSlug = item.subject?.slug
          const subjectInfo = subjectSlug ? SUBJECT_CONFIG[subjectSlug] : null
          const formatInfo = item.learning_format ? FORMAT_CONFIG[item.learning_format] : null

          return (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                item.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'
              } transition-colors cursor-pointer`}
              onClick={() => {
                if (onStatusChange) {
                  const nextStatus: Record<string, FlightPlanStatus> = {
                    pending: 'in_progress', in_progress: 'completed', completed: 'completed', skipped: 'pending'
                  }
                  onStatusChange(item.id, nextStatus[item.status] || 'pending')
                }
              }}
            >
              <div className="text-xl">{subjectInfo?.icon || formatInfo?.icon || '📝'}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${item.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {subjectInfo && <span className="text-xs text-gray-500">{subjectInfo.name}</span>}
                  {formatInfo && <span className="text-xs text-gray-400">• {formatInfo.name}</span>}
                  {item.estimated_minutes && <span className="text-xs text-gray-400">• {item.estimated_minutes}min</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
