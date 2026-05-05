import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import MatchingPairsGame from './MatchingPairsGame'
import DragDropSortGame from './DragDropSortGame'
import MemoryMatchGame from './MemoryMatchGame'

// ─── Types ───────────────────────────────────────────────────────────
interface GameState {
  gameType: 'matching' | 'sorting' | 'memory'
  title: string
  data: any // game-specific data structure
  playlistItemId?: string
}

// ─── Main Component ──────────────────────────────────────────────────
export default function GameLauncher() {
  const navigate = useNavigate()
  const location = useLocation()
  const { gameType } = useParams<{ gameType: string }>()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load game state from router location state
  useEffect(() => {
    const state = location.state as GameState | null

    if (state && state.gameType && state.title && state.data) {
      setGameState(state)
      setLoading(false)
    } else if (gameType) {
      // No state passed — show a friendly error
      setError(
        'Game data was not found. Please go back to your Flight Plan and try again.'
      )
      setLoading(false)
    } else {
      setError('No game type specified.')
      setLoading(false)
    }
  }, [location.state, gameType])

  // Navigate back to Flight Plan
  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  // Handle game completion
  const handleComplete = useCallback(
    (score: number, total: number) => {
      // Could POST results to backend here
      console.log(
        `[GameLauncher] Game completed: ${score}/${total}`,
        gameState?.playlistItemId
          ? `for playlist item ${gameState.playlistItemId}`
          : ''
      )

      // Navigate back after a brief delay to let celebration play out
      setTimeout(() => {
        navigate(-1)
      }, 500)
    },
    [navigate, gameState]
  )

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h2 className="text-2xl font-bold text-indigo-700 mb-2">
            Loading Game...
          </h2>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Error State ───────────────────────────────────────────────────
  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Something went wrong loading the game.'}
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors min-h-[48px]"
          >
            ← Back to Flight Plan
          </button>
        </div>
      </div>
    )
  }

  // ─── Render Game ───────────────────────────────────────────────────
  const resolvedType = gameState.gameType || gameType

  switch (resolvedType) {
    case 'matching':
      return (
        <MatchingPairsGame
          pairs={gameState.data.pairs || gameState.data}
          title={gameState.title}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      )

    case 'sorting':
      return (
        <DragDropSortGame
          categories={gameState.data.categories}
          items={gameState.data.items}
          title={gameState.title}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      )

    case 'memory':
      return (
        <MemoryMatchGame
          cards={gameState.data.cards || gameState.data}
          title={gameState.title}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      )

    default:
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
            <div className="text-5xl mb-4">🤔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Unknown Game Type
            </h2>
            <p className="text-gray-600 mb-4">
              Game type "<span className="font-mono">{resolvedType}</span>" is
              not recognized.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Supported types: matching, sorting, memory
            </p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors min-h-[48px]"
            >
              ← Back to Flight Plan
            </button>
          </div>
        </div>
      )
  }
}
