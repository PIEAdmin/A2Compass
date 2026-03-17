import type { LearningFormatSlug } from '../types'

export const FORMAT_CONFIG: Record<LearningFormatSlug, { name: string; icon: string; description: string }> = {
  'live-seminar': { name: 'Live Seminar', icon: '🎥', description: 'Real-time interactive sessions' },
  'discussion-board': { name: 'Discussion Board', icon: '💬', description: 'Async peer discussions' },
  'choice-board': { name: 'Choice Board', icon: '🎯', description: 'Student-selected activities' },
  'independent-project': { name: 'Independent Project', icon: '🔨', description: 'Self-directed deep work' },
  'partner-quest': { name: 'Partner Quest', icon: '🤝', description: 'Collaborative pair work' },
  'one-on-one-coaching': { name: 'One-on-One Coaching', icon: '👩‍🏫', description: 'Personal teacher time' },
  'practice-arena': { name: 'Practice Arena', icon: '⚡', description: 'Skill-building exercises' },
}
