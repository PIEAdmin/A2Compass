import type { TierSlug, TierThemeConfig } from '../types'

export const TIER_THEMES: Record<TierSlug, TierThemeConfig> = {
  'explorers-camp': {
    primaryColor: '#FF6B35',
    secondaryColor: '#FFD166',
    accentColor: '#06D6A0',
    bgGradient: 'from-orange-50 to-yellow-50',
    icon: '🏕️',
    fontStyle: 'playful',
  },
  'scholars-guild': {
    primaryColor: '#118AB2',
    secondaryColor: '#06D6A0',
    accentColor: '#FFD166',
    bgGradient: 'from-blue-50 to-teal-50',
    icon: '🏛️',
    fontStyle: 'balanced',
  },
  'the-collegium': {
    primaryColor: '#073B4C',
    secondaryColor: '#118AB2',
    accentColor: '#EF476F',
    bgGradient: 'from-slate-50 to-blue-50',
    icon: '🎓',
    fontStyle: 'professional',
  },
}

export const TIER_LABELS: Record<TierSlug, string> = {
  'explorers-camp': "Explorers\' Camp",
  'scholars-guild': "Scholars\' Guild",
  'the-collegium': 'The Collegium',
}

export const GRADE_TO_TIER: Record<number, TierSlug> = {
  1: 'explorers-camp', 2: 'explorers-camp', 3: 'explorers-camp',
  4: 'explorers-camp', 5: 'explorers-camp', 6: 'explorers-camp',
  7: 'scholars-guild', 8: 'scholars-guild', 9: 'scholars-guild',
  10: 'the-collegium', 11: 'the-collegium', 12: 'the-collegium',
}
