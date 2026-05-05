'use client'

import { useState, useCallback, useMemo } from 'react'

interface Skill {
  id: string
  name: string
  code: string
  domainName: string
  masteryLevel: number
  status: 'mastered' | 'in_progress' | 'locked' | 'ready'
  order: number
}

interface LearningPathMapProps {
  skills: Skill[]
  studentName: string
  onSkillClick?: (skillId: string) => void
}

const STATUS_CONFIG = {
  mastered: { color: '#10B981', bg: 'bg-emerald-500', icon: '✅', ring: 'ring-emerald-300' },
  in_progress: { color: '#F59E0B', bg: 'bg-amber-500', icon: '📖', ring: 'ring-amber-300' },
  locked: { color: '#9CA3AF', bg: 'bg-gray-400', icon: '🔒', ring: 'ring-gray-300' },
  ready: { color: '#6366F1', bg: 'bg-indigo-500', icon: '⭐', ring: 'ring-indigo-300' },
} as const

const DOMAIN_COLORS: Record<string, string> = {
  default: 'bg-slate-200 text-slate-700',
}

function getDomainPillClass(domain: string): string {
  // Generate a deterministic color from the domain name
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-cyan-100 text-cyan-700',
    'bg-rose-100 text-rose-700',
    'bg-lime-100 text-lime-700',
  ]
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function MasteryRing({ percent, color, size }: { percent: number; color: string; size: number }) {
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={4}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

export default function LearningPathMap({
  skills,
  studentName,
  onSkillClick,
}: LearningPathMapProps) {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)

  const sortedSkills = useMemo(
    () => [...skills].sort((a, b) => a.order - b.order),
    [skills]
  )

  // Reversed for display: bottom = start, top = finish
  const displaySkills = useMemo(() => [...sortedSkills].reverse(), [sortedSkills])

  const overallProgress = useMemo(() => {
    if (skills.length === 0) return 0
    const masteredCount = skills.filter((s) => s.status === 'mastered').length
    return Math.round((masteredCount / skills.length) * 100)
  }, [skills])

  const handleClick = useCallback(
    (skillId: string, status: Skill['status']) => {
      if (status === 'locked') return
      onSkillClick?.(skillId)
    },
    [onSkillClick]
  )

  // SVG path dimensions
  const ISLAND_SIZE = 64
  const VERTICAL_GAP = 120
  const SVG_WIDTH = 320
  const CENTER_X = SVG_WIDTH / 2
  const ZIGZAG_OFFSET = 80
  const TOP_PADDING = 80
  const BOTTOM_PADDING = 80

  const totalHeight = displaySkills.length * VERTICAL_GAP + TOP_PADDING + BOTTOM_PADDING

  // Calculate positions for each island
  const positions = useMemo(() => {
    return displaySkills.map((_, idx) => {
      const y = TOP_PADDING + idx * VERTICAL_GAP
      const x = CENTER_X + (idx % 2 === 0 ? -ZIGZAG_OFFSET : ZIGZAG_OFFSET)
      return { x, y }
    })
  }, [displaySkills])

  // Build the SVG dashed trail path
  const trailPath = useMemo(() => {
    if (positions.length === 0) return ''
    const parts = positions.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    return parts.join(' ')
  }, [positions])

  return (
    <div className="w-full max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-sky-50 to-white/90 backdrop-blur px-4 pt-4 pb-3 rounded-b-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          🗺️ {studentName}&apos;s Learning Path
        </h2>
        {/* Overall progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-10 text-right">
            {overallProgress}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {skills.filter((s) => s.status === 'mastered').length} of {skills.length} skills mastered
        </p>
      </div>

      {/* Map container */}
      <div className="relative overflow-x-hidden" style={{ minHeight: totalHeight }}>
        {/* SVG trail line */}
        <svg
          width={SVG_WIDTH}
          height={totalHeight}
          className="absolute inset-0 mx-auto pointer-events-none"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {trailPath && (
            <path
              d={trailPath}
              fill="none"
              stroke="#d1d5db"
              strokeWidth={3}
              strokeDasharray="8 6"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Finish flag at the top */}
        <div
          className="absolute flex flex-col items-center z-10"
          style={{
            left: '50%',
            top: TOP_PADDING - 60,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-3xl">🏁</span>
          <span className="text-xs font-bold text-gray-600 mt-0.5">Subject Mastery!</span>
        </div>

        {/* Skill islands */}
        {displaySkills.map((skill, idx) => {
          const pos = positions[idx]
          if (!pos) return null

          const config = STATUS_CONFIG[skill.status]
          const isLocked = skill.status === 'locked'
          const isInProgress = skill.status === 'in_progress'
          const isHovered = hoveredSkill === skill.id
          const showRing = skill.status === 'mastered' || skill.status === 'in_progress'

          return (
            <div
              key={skill.id}
              className="absolute flex flex-col items-center z-10"
              style={{
                left: `calc(50% + ${pos.x - CENTER_X}px)`,
                top: pos.y - ISLAND_SIZE / 2,
                transform: 'translateX(-50%)',
                width: 120,
              }}
            >
              {/* Penguin indicator for in-progress */}
              {isInProgress && (
                <span className="absolute -top-5 text-xl animate-bounce">🐧</span>
              )}

              {/* Island circle */}
              <button
                onClick={() => handleClick(skill.id, skill.status)}
                onMouseEnter={() => setHoveredSkill(skill.id)}
                onMouseLeave={() => setHoveredSkill(null)}
                disabled={isLocked}
                className={`
                  relative flex items-center justify-center
                  rounded-full transition-all duration-200
                  ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                  ${isHovered && !isLocked ? 'shadow-lg scale-110' : 'shadow-md'}
                  ${isInProgress ? 'ring-4 ring-amber-300/50 animate-pulse' : ''}
                `}
                style={{ width: ISLAND_SIZE, height: ISLAND_SIZE }}
                aria-label={`${skill.name} — ${skill.status}`}
              >
                {/* Mastery ring */}
                {showRing && (
                  <MasteryRing
                    percent={skill.masteryLevel}
                    color={config.color}
                    size={ISLAND_SIZE}
                  />
                )}

                {/* Inner circle */}
                <span
                  className={`
                    flex items-center justify-center rounded-full text-lg
                    ${config.bg} text-white
                    ${skill.status === 'mastered' ? 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' : ''}
                  `}
                  style={{ width: ISLAND_SIZE - 12, height: ISLAND_SIZE - 12 }}
                >
                  {config.icon}
                </span>
              </button>

              {/* Skill name */}
              <span
                className="mt-1.5 text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 max-w-[100px]"
                title={skill.name}
              >
                {skill.name}
              </span>

              {/* Domain pill */}
              <span
                className={`
                  mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none
                  ${getDomainPillClass(skill.domainName)}
                `}
              >
                {skill.domainName}
              </span>

              {/* Mastery percentage label */}
              {showRing && (
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  {skill.masteryLevel}%
                </span>
              )}
            </div>
          )
        })}

        {/* Start label at the bottom */}
        <div
          className="absolute flex flex-col items-center z-10"
          style={{
            left: '50%',
            top: totalHeight - BOTTOM_PADDING + 20,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-xs font-bold text-gray-600">Start Here! 🚀</span>
        </div>
      </div>
    </div>
  )
}
