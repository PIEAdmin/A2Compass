'use client'

import { useEffect, useState } from 'react'

interface SpeechBubbleProps {
  message: string
  mood?: 'happy' | 'excited' | 'thinking' | 'celebrating'
  position?: 'left' | 'right' | 'center'
  animate?: boolean
  onDismiss?: () => void
  className?: string
}

const moodBorderColors: Record<NonNullable<SpeechBubbleProps['mood']>, string> = {
  happy: 'border-blue-400',
  excited: 'border-amber-400',
  thinking: 'border-purple-400',
  celebrating: 'border-emerald-400',
}

const moodBgAccents: Record<NonNullable<SpeechBubbleProps['mood']>, string> = {
  happy: 'bg-blue-400',
  excited: 'bg-amber-400',
  thinking: 'bg-purple-400',
  celebrating: 'bg-emerald-400',
}

export function SpeechBubble({
  message,
  mood = 'happy',
  position = 'left',
  animate = false,
  onDismiss,
  className = '',
}: SpeechBubbleProps) {
  const [visible, setVisible] = useState(!animate)

  useEffect(() => {
    if (animate) {
      // Trigger pop-in on next frame
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
  }, [animate])

  const borderColor = moodBorderColors[mood]
  const accentBg = moodBgAccents[mood]

  // Pointer styles per position
  const pointerMarkup = (() => {
    const base = `absolute w-4 h-4 bg-white border-2 ${borderColor} rotate-45`

    if (position === 'left') {
      // Pointer on the left side, pointing left toward the penguin
      return (
        <span
          className={base}
          style={{
            left: '-9px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            borderRight: 'none',
            borderTop: 'none',
          }}
        />
      )
    }

    if (position === 'right') {
      // Pointer on the right side, pointing right toward the penguin
      return (
        <span
          className={base}
          style={{
            right: '-9px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            borderLeft: 'none',
            borderBottom: 'none',
          }}
        />
      )
    }

    // center — pointer at the bottom, pointing down toward the penguin
    return (
      <span
        className={base}
        style={{
          bottom: '-9px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          borderLeft: 'none',
          borderTop: 'none',
        }}
      />
    )
  })()

  const justifyClass =
    position === 'left'
      ? 'justify-start'
      : position === 'right'
        ? 'justify-end'
        : 'justify-center'

  return (
    <div className={`flex ${justifyClass} ${className}`}>
      <div
        className={`
          relative max-w-xs rounded-2xl border-2 bg-white px-4 py-3 shadow-md
          ${borderColor}
          transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
        `}
      >
        {/* Mood accent dot */}
        <span
          className={`absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full ${accentBg} opacity-70`}
        />

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-1 right-1.5 text-gray-400 hover:text-gray-600 transition-colors text-xs leading-none p-0.5"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}

        {/* Message text */}
        <p
          className="text-gray-800 text-sm leading-relaxed pr-4"
          style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Patrick Hand", cursive, sans-serif' }}
        >
          {message}
        </p>

        {/* Triangle pointer */}
        {pointerMarkup}
      </div>
    </div>
  )
}
