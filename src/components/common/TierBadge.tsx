import type { TierSlug } from '../../types'
import { TIER_THEMES } from '../../constants'

interface Props {
  tier: TierSlug
  size?: 'sm' | 'md' | 'lg'
}

const tierNames: Record<TierSlug, string> = {
  'explorers-camp': "Explorers' Camp",
  'scholars-guild': "Scholars' Guild",
  'the-collegium': 'The Collegium',
}

export default function TierBadge({ tier, size = 'md' }: Props) {
  const theme = TIER_THEMES[tier]
  const sizeClasses = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' }[size]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: theme.primaryColor + '15', color: theme.primaryColor }}
    >
      <span>{theme.icon}</span>
      <span>{tierNames[tier]}</span>
    </span>
  )
}
