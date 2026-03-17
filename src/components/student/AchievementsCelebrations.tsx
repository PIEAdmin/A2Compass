import type { StudentMastery } from '../../types'

interface Props {
  achievements: StudentMastery[]
  tierStyle?: 'playful' | 'balanced' | 'professional'
}

export default function AchievementsCelebrations({ achievements, tierStyle = 'balanced' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-compass-navy mb-4">
        {tierStyle === 'playful' ? '🎉 Celebrations!' : tierStyle === 'professional' ? '🏆 Achievements' : '🏆 Recent Achievements'}
      </h3>

      {achievements.length === 0 ? (
        <p className="text-gray-500 text-sm">Keep learning — your first achievement is just around the corner! 🌟</p>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <span className="text-xl">⭐</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Mastered: {a.standard?.description || 'Learning Standard'}
                </p>
                {a.mastered_at && (
                  <p className="text-xs text-gray-500">
                    {new Date(a.mastered_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
