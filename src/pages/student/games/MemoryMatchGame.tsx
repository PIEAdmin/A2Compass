import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────
interface CardData {
  id: string
  content: string
  type?: 'text' | 'emoji'
}

interface MemoryMatchGameProps {
  cards: Array<CardData>
  title: string
  onComplete: (score: number, total: number) => void
  onBack: () => void
}

interface GameCard {
  uid: string       // unique ID for this card instance
  originalId: string // original card ID (shared by pair)
  content: string
  type: 'text' | 'emoji'
  flipped: boolean
  matched: boolean
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

// ─── Card back patterns ─────────────────────────────────────────────
const cardBacks = ['🐧', '🦊', '🐸', '🦋', '🐱', '🐶', '🐰', '🦄', '🐻', '🐼', '🦁', '🐯']

// ─── Grid layout calculator ─────────────────────────────────────────
function getGridCols(totalCards: number): string {
  if (totalCards <= 6) return 'grid-cols-3'      // 2x3
  if (totalCards <= 8) return 'grid-cols-4'      // 2x4
  if (totalCards <= 12) return 'grid-cols-4'     // 3x4
  return 'grid-cols-4'                           // fallback
}

// ─── Main Component ──────────────────────────────────────────────────
export default function MemoryMatchGame({ cards, title, onComplete, onBack }: MemoryMatchGameProps) {
  const totalPairs = cards.length
  const cardBackEmoji = useMemo(() => cardBacks[Math.floor(Math.random() * cardBacks.length)], [])

  // Build game cards: duplicate each card to make pairs, shuffle
  const gameCards = useMemo<GameCard[]>(() => {
    const doubled: GameCard[] = []
    cards.forEach((card) => {
      doubled.push({
        uid: `${card.id}-a`,
        originalId: card.id,
        content: card.content,
        type: card.type || 'text',
        flipped: false,
        matched: false,
      })
      doubled.push({
        uid: `${card.id}-b`,
        originalId: card.id,
        content: card.content,
        type: card.type || 'text',
        flipped: false,
        matched: false,
      })
    })
    return shuffle(doubled)
  }, [cards])

  const [boardCards, setBoardCards] = useState<GameCard[]>(gameCards)
  const [flippedUids, setFlippedUids] = useState<string[]>([])
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [sparkleUid, setSparkleUid] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const matchedCount = matchedIds.size
  const gridCols = getGridCols(boardCards.length)

  // Handle card tap
  const handleCardTap = useCallback(
    (uid: string) => {
      if (isChecking) return
      if (flippedUids.includes(uid)) return

      const card = boardCards.find((c) => c.uid === uid)
      if (!card || card.matched) return
      if (flippedUids.length >= 2) return

      const newFlipped = [...flippedUids, uid]
      setFlippedUids(newFlipped)

      setBoardCards((prev) =>
        prev.map((c) => (c.uid === uid ? { ...c, flipped: true } : c))
      )

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1)
        setIsChecking(true)

        const first = boardCards.find((c) => c.uid === newFlipped[0])!
        const second = boardCards.find((c) => c.uid === newFlipped[1])!

        if (first.originalId === second.originalId) {
          // Match found!
          setTimeout(() => {
            setMatchedIds((prev) => new Set([...prev, first.originalId]))
            setBoardCards((prev) =>
              prev.map((c) =>
                c.originalId === first.originalId ? { ...c, matched: true, flipped: true } : c
              )
            )
            setSparkleUid(first.originalId)
            setTimeout(() => setSparkleUid(null), 600)
            setFlippedUids([])
            setIsChecking(false)
          }, 500)
        } else {
          // No match — flip back after delay
          setTimeout(() => {
            setBoardCards((prev) =>
              prev.map((c) =>
                newFlipped.includes(c.uid) ? { ...c, flipped: false } : c
              )
            )
            setFlippedUids([])
            setIsChecking(false)
          }, 1500)
        }
      }
    },
    [boardCards, flippedUids, isChecking]
  )

  // Check completion
  useEffect(() => {
    if (matchedCount === totalPairs && totalPairs > 0 && !completed) {
      setCompleted(true)
      setShowConfetti(true)
      // Score: fewer moves = better. Perfect = totalPairs moves. Score out of totalPairs.
      const perfectMoves = totalPairs
      const score = Math.max(0, Math.round(totalPairs * Math.min(1, perfectMoves / Math.max(moves, 1))))
      setTimeout(() => onComplete(score, totalPairs), 3000)
    }
  }, [matchedCount, totalPairs, completed, moves, onComplete])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50">
      {showConfetti && <Confetti />}

      <style>{`
        .card-flip {
          perspective: 600px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.5s ease;
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
        }
        .card-back {
          transform: rotateY(0deg);
        }
        .card-front {
          transform: rotateY(180deg);
        }
        @keyframes sparkle {
          0% { box-shadow: 0 0 0px rgba(16, 185, 129, 0); }
          50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
          100% { box-shadow: 0 0 0px rgba(16, 185, 129, 0); }
        }
        @keyframes matchPop {
          0% { transform: rotateY(180deg) scale(1); }
          50% { transform: rotateY(180deg) scale(1.1); }
          100% { transform: rotateY(180deg) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-amber-100 text-sm">Find all the matching pairs!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {matchedCount}/{totalPairs}
            </div>
            <div className="text-amber-200 text-xs">pairs</div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="max-w-2xl mx-auto px-4 mt-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(matchedCount / totalPairs) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-full px-3 py-1 shadow text-sm font-semibold text-gray-600">
          🎯 {moves} moves
        </div>
      </div>

      {/* Game area */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {completed ? (
          /* Completion screen */
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🧠🎉🏆</div>
            <h2 className="text-3xl font-bold text-amber-800 mb-2">Memory Master!</h2>
            <p className="text-lg text-rose-600 mb-4">You found all {totalPairs} pairs!</p>
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{totalPairs}</div>
                <div className="text-sm text-gray-500">Pairs</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{moves}</div>
                <div className="text-sm text-gray-500">Moves</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {totalPairs > 0
                    ? Math.round((totalPairs / Math.max(moves, 1)) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-gray-500">Efficiency</div>
              </div>
            </div>
          </div>
        ) : (
          /* Card grid */
          <div className={`grid ${gridCols} gap-3`}>
            {boardCards.map((card) => {
              const isMatchSparkle = sparkleUid === card.originalId

              return (
                <button
                  key={card.uid}
                  onClick={() => handleCardTap(card.uid)}
                  disabled={card.matched || card.flipped}
                  className="card-flip aspect-square"
                  style={{
                    animation: isMatchSparkle ? 'sparkle 0.6s ease-in-out' : undefined,
                  }}
                >
                  <div className={`card-inner ${card.flipped || card.matched ? 'flipped' : ''}`}
                    style={{
                      animation: card.matched && isMatchSparkle ? 'matchPop 0.5s ease-in-out' : undefined,
                    }}
                  >
                    {/* Back face (hidden side) */}
                    <div className="card-face card-back bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-indigo-400 shadow-lg hover:shadow-xl transition-shadow cursor-pointer active:scale-95">
                      <span className="text-4xl">{cardBackEmoji}</span>
                    </div>

                    {/* Front face (content) */}
                    <div
                      className={`card-face card-front border-2 shadow-lg ${
                        card.matched
                          ? 'bg-emerald-50 border-emerald-400'
                          : 'bg-white border-amber-300'
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          card.type === 'emoji' ? 'text-4xl' : 'text-2xl text-gray-800'
                        }`}
                      >
                        {card.content}
                      </span>
                      {card.matched && (
                        <span className="absolute top-1 right-1 text-sm">✅</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
