export const TIERS = {
  EXPLORERS_CAMP: {
    slug: 'explorers-camp',
    name: "Explorers' Camp",
    emoji: '🌿',
    grades: '1-6',
    color: 'explorer',
    description: 'Discovery-based learning with guided exploration',
  },
  SCHOLARS_GUILD: {
    slug: 'scholars-guild',
    name: "Scholars' Guild",
    emoji: '📘',
    grades: '7-9',
    color: 'scholar',
    description: 'Critical thinking and collaborative learning',
  },
  THE_COLLEGIUM: {
    slug: 'the-collegium',
    name: 'The Collegium',
    emoji: '🎓',
    grades: '10-12',
    color: 'collegium',
    description: 'Independent research and college preparation',
  },
} as const

export const MASTERY_THRESHOLD = 0.85

export const SUBJECTS = [
  { slug: 'math', name: 'Mathematics', icon: '🔢' },
  { slug: 'reading-ela', name: 'Reading / ELA', icon: '📖' },
  { slug: 'science', name: 'Science', icon: '🔬' },
  { slug: 'social-studies', name: 'Social Studies', icon: '🌍' },
  { slug: 'foreign-language', name: 'Foreign Language', icon: '🗣️' },
  { slug: 'creative-arts', name: 'Creative Arts', icon: '🎨' },
] as const

export const LEARNING_FORMATS = [
  { slug: 'live-seminar', name: 'Live Seminar', icon: '📡' },
  { slug: 'discussion-board', name: 'Discussion Board', icon: '💬' },
  { slug: 'choice-board', name: 'Choice Board', icon: '🎯' },
  { slug: 'independent-project', name: 'Independent Project', icon: '🔨' },
  { slug: 'partner-quest', name: 'Partner Quest', icon: '🤝' },
  { slug: 'one-on-one-coaching', name: 'One-on-One Coaching', icon: '👤' },
  { slug: 'practice-arena', name: 'Practice Arena', icon: '⚔️' },
] as const

export const ENROLLMENT_TYPES = [
  { slug: 'full-time', name: 'Full-Time', description: 'Complete curriculum coverage' },
  { slug: 'tutoring', name: 'Tutoring', description: 'Targeted subject support' },
  { slug: 'summer-program', name: 'Summer Program', description: 'Seasonal enrichment' },
  { slug: 'a-la-carte', name: 'A La Carte', description: 'Individual course selection' },
] as const
