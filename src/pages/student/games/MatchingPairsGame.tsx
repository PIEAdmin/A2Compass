import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────
interface PairItem {
  id: string
  left: string
  right: string
  leftType?: 'text' | 'emoji'
  rightType?: 'text' | 'emoji'
}

interface MatchingPairsGameProps {
  pairs: Array<PairItem>
  title: string
  onComplete: (score: number, total: number) => void
  onBack: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Confetti Component ──────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 1.5 + Math.random() * 2,
        color: ['#6366f1', '#a855f7', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6'][i % 6],
        rotation: Math.random() * 360,
        size: 6 + Math.random() * 8,
      })),
    []
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-bounce"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.size > 10 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function MatchingPairsGame({ pairs, title, onComplete, onBack }: MatchingPairsGameProps) {
  const gamePairs = useMemo(() => pairs.slice(0, 8), [pairs])
  const total = gamePairs.length

  const shuffledLeft = useMemo(() => shuffle(gamePairs), [gamePairs])
  const shuffledRight = useMemo(() => shuffle(gamePairs), [gamePairs])

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [wrongLeft, setWrongLeft] = useState<string | null>(null)
  const [wrongRight, setWrongRight] = useState<string | null>(null)
  const [correctFlash, setCorrectFlash] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [firstTryIds, setFirstTryIds] = useState<Set<string>>(new Set())
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Check match after both sides selected
  const checkMatch = useCallback(
    (leftId: string, rightId: string) => {
      setAttempts((a) => a + 1)

      if (leftId === rightId) {
        // Correct match
        setCorrectFlash(leftId)
        setMatchedIds((prev) => new Set([...prev, leftId]))

        if (!failedIds.has(leftId)) {
          setFirstTryIds((prev) => new Set([...prev, leftId]))
        }

        setTimeout(() => {
          setCorrectFlash(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 600)
      } else {
        // Wrong match
        setWrongLeft(leftId)
        setWrongRight(rightId)
        setFailedIds((prev) => new Set([...prev, leftId]))

        setTimeout(() => {
          setWrongLeft(null)
          setWrongRight(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 800)
      }
    },
    [failedIds]
  )

  // Handle left item tap
  const handleLeftTap = useCallback(
    (id: string) => {
      if (matchedIds.has(id) || wrongLeft || correctFlash) return
      setSelectedLeft(id)

      if (selectedRight !== null) {
        checkMatch(id, selectedRight)
      }
    },
    [matchedIds, wrongLeft, correctFlash, selectedRight, checkMatch]
  )

  // Handle right item tap
  const handleRightTap = useCallback(
    (id: string) => {
      if (matchedIds.has(id) || wrongRight || correctFlash) return
      setSelectedRight(id)

      if (selectedLeft !== null) {
        checkMatch(selectedLeft, id)
      }
    },
    [matchedIds, wrongRight, correctFlash, selectedLeft, checkMatch]
  )

  // Completion check
  useEffect(() => {
    if (matchedIds.size === total && total > 0 && !completed) {
      setCompleted(true)
      setShowConfetti(true)
      const score = firstTryIds.size
      setTimeout(() => onComplete(score, total), 3000)
    }
  }, [matchedIds, total, completed, firstTryIds, onComplete])

  const matchedCount = matchedIds.size

  // Card style builder
  const getCardClasses = (
    id: string,
    side: 'left' | 'right',
    isSelected: boolean
  ): string => {
    const base =
      'flex items-center justify-center p-3 rounded-2xl font-bold text-lg min-h-[56px] cursor-pointer transition-all duration-200 select-none border-2'

    if (matchedIds.has(id)) {
      return `${base} bg-emerald-100 border-emerald-400 text-emerald-700 scale-95 opacity-80`
    }
    if (
      (side === 'left' && wrongLeft === id) ||
      (side === 'right' && wrongRight === id)
    ) {
      return `${base} bg-rose-100 border-rose-400 text-rose-700 animate-[shakeX_0.5s_ease-in-out]`
    }
    if (correctFlash === id) {
      return `${base} bg-emerald-200 border-emerald-500 text-emerald-800 animate-[pulse_0.5s_ease-in-out]`
    }
    if (isSelected) {
      return `${base} bg-indigo-100 border-indigo-500 text-indigo-800 ring-2 ring-indigo-300 scale-105 shadow-lg`
    }
    if (side === 'left') {
      return `${base} bg-white border-purple-300 text-purple-800 hover:border-purple-500 hover:shadow-md active:scale-95`
    }
    return `${base} bg-white border-amber-300 text-amber-800 hover:border-amber-500 hover:shadow-md active:scale-95`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {showConfetti && <Confetti />}

      {/* Shake keyframes */}
      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ← 
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-indigo-100 text-sm">Match the pairs!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {matchedCount}/{total}
            </div>
            <div className="text-indigo-200 text-xs">pairs</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 mt-3">
        <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(matchedCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Instructions */}
      {!selectedLeft && !selectedRight && matchedCount === 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-amber-800 text-sm">
            👆 Tap a card on the left, then tap its match on the right!
          </div>
        </div>
      )}

      {/* Game area */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {completed ? (
          /* Completion screen */
          <div className="text-center py-8 animate-[pulse_1s_ease-in-out]">
            <div className="text-6xl mb-4">🎉🏆🎉</div>
            <h2 className="text-3xl font-bold text-indigo-800 mb-2">Amazing Job!</h2>
            <p className="text-lg text-purple-600 mb-4">You matched all the pairs!</p>
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{firstTryIds.size}</div>
                <div className="text-sm text-gray-500">Perfect</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{attempts}</div>
                <div className="text-sm text-gray-500">Attempts</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {total > 0 ? Math.round((firstTryIds.size / total) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
            </div>
          </div>
        ) : (
          /* Game grid: two columns */
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              <div className="text-center text-sm font-semibold text-purple-600 mb-1">
                🟣 Pick one
              </div>
              {shuffledLeft.map((pair) => (
                <button
                  key={`left-${pair.id}`}
                  onClick={() => handleLeftTap(pair.id)}
                  disabled={matchedIds.has(pair.id)}
                  className={getCardClasses(pair.id, 'left', selectedLeft === pair.id)}
                  style={{ minHeight: '56px' }}
                >
                  {matchedIds.has(pair.id) && <span className="mr-1">✅</span>}
                  <span className={pair.leftType === 'emoji' ? 'text-2xl' : ''}>
                    {pair.left}
                  </span>
                </button>
              ))}
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <div className="text-center text-sm font-semibold text-amber-600 mb-1">
                🟡 Find match
              </div>
              {shuffledRight.map((pair) => (
                <button
                  key={`right-${pair.id}`}
                  onClick={() => handleRightTap(pair.id)}
                  disabled={matchedIds.has(pair.id)}
                  className={getCardClasses(pair.id, 'right', selectedRight === pair.id)}
                  style={{ minHeight: '56px' }}
                >
                  {matchedIds.has(pair.id) && <span className="mr-1">✅</span>}
                  <span className={pair.rightType === 'emoji' ? 'text-2xl' : ''}>
                    {pair.right}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
