import type { MasterySummary } from '../../types'
import { MasteryBar } from '../common'

interface Props {
  summaries: MasterySummary[]
  streak: number
  tierStyle?: 'playful' | 'balanced' | 'professional'
}

export default function ProgressDashboard({ summaries, streak, tierStyle = 'balanced' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-compass-navy">📊 My Progress</h3>
        {streak > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <span>🔥</span>
            <span className="font-medium text-orange-600">{streak} day streak</span>
          </div>
        )}
      </div>

      {summaries.length === 0 ? (
        <p className="text-gray-500 text-sm">No mastery data yet. Complete some activities to see your progress!</p>
      ) : (
        <div className="space-y-4">
          {summaries.map((s) => (
            <div key={s.subject.id}>
              <div className="flex items-center gap-2 mb-1">
                <span>{s.subject.icon}</span>
                <span className="text-sm font-medium text-gray-700">{s.subject.name}</span>
                {s.level === 'mastered' && <span className="text-xs">⭐</span>}
              </div>
              <MasteryBar
                percentage={s.currentPercentage}
                color={s.subject.color}
                showLabel={false}
                size={tierStyle === 'playful' ? 'lg' : 'md'}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{s.standardsMastered}/{s.standardsTotal} standards mastered</span>
                <span className="text-xs font-medium" style={{ color: s.subject.color }}>{s.currentPercentage}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
