import { useMemo } from 'react'
import type { TierSlug, TierThemeConfig } from '../types'
import { TIER_THEMES } from '../constants'

const DEFAULT_THEME: TierThemeConfig = {
  primaryColor: '#1E3A5F',
  secondaryColor: '#3B82F6',
  accentColor: '#10B981',
  bgGradient: 'from-gray-50 to-blue-50',
  icon: '🧭',
  fontStyle: 'balanced',
}

export function useTier(tierSlug: TierSlug | null | undefined) {
  const theme = useMemo(() => {
    if (!tierSlug) return DEFAULT_THEME
    return TIER_THEMES[tierSlug] || DEFAULT_THEME
  }, [tierSlug])

  return {
    theme,
    tierSlug,
    isExplorers: tierSlug === 'explorers-camp',
    isScholars: tierSlug === 'scholars-guild',
    isCollegium: tierSlug === 'the-collegium',
  }
}
