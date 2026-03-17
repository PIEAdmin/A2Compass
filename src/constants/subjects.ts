import type { SubjectSlug } from '../types'

export const SUBJECT_CONFIG: Record<SubjectSlug, { name: string; icon: string; color: string }> = {
  'math': { name: 'Mathematics', icon: '🔢', color: '#3B82F6' },
  'reading-ela': { name: 'Reading / ELA', icon: '📖', color: '#8B5CF6' },
  'science': { name: 'Science', icon: '🔬', color: '#10B981' },
  'social-studies': { name: 'Social Studies', icon: '🌍', color: '#F59E0B' },
  'foreign-language': { name: 'Foreign Language', icon: '🗣️', color: '#EC4899' },
  'creative-arts': { name: 'Creative Arts', icon: '🎨', color: '#F97316' },
}
