import { useState, useEffect } from 'react'

interface StreakTrackerProps {
  currentStreak: number
  longestStreak: number
  todayCompleted: boolean
  weekActivity: boolean[] // 7 booleans for Mon-Sun, true if student was active
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getStreakMessage(streak: number): string | null {
  if (streak >= 7) return 'Unstoppable! 🌟🔥'
  if (streak >= 3) return 'On fire! 🔥🔥🔥'
  return null
}

export default function StreakTracker({
  currentStreak,
  longestStreak,
  todayCompleted,
  weekActivity,
}: StreakTrackerProps) {
  const [pulse, setPulse] = useState(true)

  // Toggle pulse animation for today's incomplete circle
  useEffect(() => {
    if (todayCompleted) {
      setPulse(false)
      return
    }
    const interval = setInterval(() => setPulse((p) => !p), 1000)
    return () => clearInterval(interval)
  }, [todayCompleted])

  const todayIndex = new Date().getDay()
  // Convert JS Sunday=0..Saturday=6 to Mon=0..Sun=6
  const todayMondayIndex = todayIndex === 0 ? 6 : todayIndex - 1

  const streakMessage = getStreakMessage(currentStreak)

  return (
    <div
      className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-md"
      style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
        maxHeight: '80px',
      }}
    >
      {/* Left: Streak count */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-2xl" role="img" aria-label="fire">
          🔥
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-lg">
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
          <span className="text-white/70 text-xs">
            Longest: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Center: Day circles */}
      <div className="flex items-center gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const isToday = i === todayMondayIndex
          const isActive = weekActivity[i] ?? false

          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-white/60 text-[10px] font-medium leading-none">
                {label}
              </span>
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${
                    isToday && todayCompleted
                      ? 'bg-white text-green-600 ring-2 ring-white'
                      : isToday && !todayCompleted
                      ? `bg-white/20 text-white ring-2 ring-white/60 ${
                          pulse ? 'scale-110' : 'scale-100'
                        }`
                      : isActive
                      ? 'bg-white text-orange-600'
                      : 'bg-white/20 text-white/40'
                  }
                `}
              >
                {isToday && todayCompleted ? '✅' : isActive ? '●' : '○'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Right: Streak message */}
      <div className="shrink-0 text-right">
        {streakMessage && (
          <span className="text-white font-semibold text-sm whitespace-nowrap">
            {streakMessage}
          </span>
        )}
      </div>
    </div>
  )
}
