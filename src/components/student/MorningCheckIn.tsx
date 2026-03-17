import { useState } from 'react'

const moods = [
  { emoji: '😊', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😟', label: 'Struggling' },
  { emoji: '😴', label: 'Tired' },
]

const messages = [
  "Every expert was once a beginner. Keep going! 🌟",
  "Your curiosity is your superpower! 🚀",
  "Small steps lead to big discoveries! 🧭",
  "You're building something amazing, one lesson at a time! 💪",
  "Today is full of possibilities! ✨",
]

interface Props {
  studentName: string
  tierStyle?: 'playful' | 'balanced' | 'professional'
}

export default function MorningCheckIn({ studentName, tierStyle = 'balanced' }: Props) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const message = messages[Math.floor(Math.random() * messages.length)]
  const firstName = studentName?.split(' ')[0] || 'Explorer'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className={`font-semibold mb-3 ${tierStyle === 'playful' ? 'text-lg' : 'text-base'} text-compass-navy`}>
        {tierStyle === 'playful' ? `🌅 Good morning, ${firstName}!` :
         tierStyle === 'professional' ? `Welcome back, ${firstName}` :
         `Hey ${firstName}! Ready to learn?`}
      </h3>

      <p className="text-sm text-gray-500 mb-4">{message}</p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 mr-2">How are you feeling?</span>
        {moods.map((mood, i) => (
          <button
            key={i}
            onClick={() => setSelectedMood(i)}
            className={`text-2xl p-1.5 rounded-lg transition-all ${
              selectedMood === i ? 'bg-blue-100 scale-110' : 'hover:bg-gray-100'
            }`}
            title={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
