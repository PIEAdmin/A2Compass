import { EmptyState } from '../common'

export default function DailySchedule() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-compass-navy">📅 Today's Schedule</h3>
        <span className="text-sm text-gray-500">{today}</span>
      </div>
      <EmptyState
        icon="📅"
        title="No sessions scheduled"
        description="Schedule live seminars and coaching sessions here. Content creation tools are coming in Phase 2!"
      />
    </div>
  )
}
