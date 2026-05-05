import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  emoji: string
}

interface SortItem {
  id: string
  label: string
  emoji?: string
  correctCategoryId: string
}

interface DragDropSortGameProps {
  categories: Array<Category>
  items: Array<SortItem>
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

// ─── Confetti ────────────────────────────────────────────────────────
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
          className="absolute"
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

// ─── Bucket colors per index ─────────────────────────────────────────
const bucketThemes = [
  { bg: 'bg-indigo-50', border: 'border-indigo-300', headerBg: 'bg-indigo-500', text: 'text-indigo-700', itemBg: 'bg-indigo-100' },
  { bg: 'bg-amber-50', border: 'border-amber-300', headerBg: 'bg-amber-500', text: 'text-amber-700', itemBg: 'bg-amber-100' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', headerBg: 'bg-emerald-500', text: 'text-emerald-700', itemBg: 'bg-emerald-100' },
  { bg: 'bg-rose-50', border: 'border-rose-300', headerBg: 'bg-rose-500', text: 'text-rose-700', itemBg: 'bg-rose-100' },
]

// ─── Main Component ──────────────────────────────────────────────────
export default function DragDropSortGame({
  categories,
  items,
  title,
  onComplete,
  onBack,
}: DragDropSortGameProps) {
  const gameCategories = useMemo(() => categories.slice(0, 4), [categories])
  const gameItems = useMemo(() => shuffle(items.slice(0, 12)), [items])
  const total = gameItems.length

  // State
  const [pool, setPool] = useState<SortItem[]>(gameItems)
  const [buckets, setBuckets] = useState<Record<string, SortItem[]>>(() => {
    const b: Record<string, SortItem[]> = {}
    gameCategories.forEach((c) => (b[c.id] = []))
    return b
  })
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [wrongItemId, setWrongItemId] = useState<string | null>(null)
  const [correctFlash, setCorrectFlash] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [firstTryItems, setFirstTryItems] = useState<Set<string>>(new Set())
  const [failedItems, setFailedItems] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Handle item tap (from pool)
  const handleItemTap = useCallback(
    (itemId: string) => {
      if (wrongItemId || correctFlash) return
      setSelectedItemId((prev) => (prev === itemId ? null : itemId))
    },
    [wrongItemId, correctFlash]
  )

  // Handle category tap
  const handleCategoryTap = useCallback(
    (categoryId: string) => {
      if (!selectedItemId || wrongItemId || correctFlash) return

      const item = pool.find((i) => i.id === selectedItemId)
      if (!item) return

      setAttempts((a) => a + 1)

      if (item.correctCategoryId === categoryId) {
        // Correct!
        setCorrectFlash(categoryId)
        setCorrectCount((c) => c + 1)
        setPool((prev) => prev.filter((i) => i.id !== item.id))
        setBuckets((prev) => ({
          ...prev,
          [categoryId]: [...prev[categoryId], item],
        }))

        if (!failedItems.has(item.id)) {
          setFirstTryItems((prev) => new Set([...prev, item.id]))
        }

        setTimeout(() => {
          setCorrectFlash(null)
          setSelectedItemId(null)
        }, 500)
      } else {
        // Wrong!
        setWrongItemId(item.id)
        setFailedItems((prev) => new Set([...prev, item.id]))

        setTimeout(() => {
          setWrongItemId(null)
          setSelectedItemId(null)
        }, 700)
      }
    },
    [selectedItemId, pool, wrongItemId, correctFlash, failedItems]
  )

  // Check completion
  useEffect(() => {
    if (pool.length === 0 && total > 0 && !completed) {
      setCompleted(true)
      setShowConfetti(true)
      const score = firstTryItems.size
      setTimeout(() => onComplete(score, total), 3000)
    }
  }, [pool, total, completed, firstTryItems, onComplete])

  const sortedCount = total - pool.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50">
      {showConfetti && <Confetti />}

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-purple-100 text-sm">Sort items into categories!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {sortedCount}/{total}
            </div>
            <div className="text-purple-200 text-xs">sorted</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 mt-3">
        <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(sortedCount / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {completed ? (
          /* Completion screen */
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉🌟🎉</div>
            <h2 className="text-3xl font-bold text-purple-800 mb-2">All Sorted!</h2>
            <p className="text-lg text-indigo-600 mb-4">Great job organizing everything!</p>
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{firstTryItems.size}</div>
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
                  {total > 0 ? Math.round((firstTryItems.size / total) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Item pool */}
            {pool.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  👆 Tap an item, then tap where it belongs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pool.map((item) => {
                    const isSelected = selectedItemId === item.id
                    const isWrong = wrongItemId === item.id

                    let cls =
                      'px-4 py-3 rounded-xl font-bold text-lg border-2 transition-all duration-200 cursor-pointer select-none min-h-[48px] flex items-center gap-2'

                    if (isWrong) {
                      cls += ' bg-rose-100 border-rose-400 text-rose-700'
                      cls += ' animate-[shakeX_0.5s_ease-in-out]'
                    } else if (isSelected) {
                      cls += ' bg-indigo-100 border-indigo-500 text-indigo-800 ring-2 ring-indigo-300 scale-105 shadow-lg'
                    } else {
                      cls += ' bg-white border-gray-200 text-gray-800 hover:border-indigo-400 hover:shadow-md active:scale-95'
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemTap(item.id)}
                        className={cls}
                      >
                        {item.emoji && <span className="text-xl">{item.emoji}</span>}
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category buckets */}
            <div
              className={`grid gap-4 ${
                gameCategories.length <= 2 ? 'grid-cols-2' : gameCategories.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
              }`}
            >
              {gameCategories.map((cat, idx) => {
                const theme = bucketThemes[idx % bucketThemes.length]
                const isFlashing = correctFlash === cat.id
                const catItems = buckets[cat.id] || []

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryTap(cat.id)}
                    className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 min-h-[140px] text-left ${
                      theme.bg
                    } ${theme.border} ${
                      selectedItemId
                        ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                        : 'cursor-default'
                    } ${isFlashing ? 'ring-4 ring-emerald-400 scale-[1.03]' : ''}`}
                  >
                    {/* Bucket header */}
                    <div
                      className={`${theme.headerBg} text-white px-3 py-2 text-center font-bold text-base`}
                    >
                      <span className="text-xl mr-1">{cat.emoji}</span>
                      {cat.name}
                    </div>

                    {/* Bucket contents */}
                    <div className="p-2 min-h-[80px]">
                      {catItems.length === 0 ? (
                        <div className="text-center text-gray-300 text-sm py-4">
                          Drop items here
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {catItems.map((item) => (
                            <span
                              key={item.id}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${theme.itemBg} ${theme.text}`}
                              style={{ animation: 'popIn 0.3s ease-out' }}
                            >
                              {item.emoji && <span>{item.emoji}</span>}
                              {item.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
