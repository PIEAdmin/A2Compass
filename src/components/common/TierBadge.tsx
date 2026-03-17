import { TIERS } from '../../constants'

type TierKey = keyof typeof TIERS

const tierMap: Record<string, TierKey> = {
  'explorers-camp': 'EXPLORERS_CAMP',
  'scholars-guild': 'SCHOLARS_GUILD',
  'the-collegium': 'THE_COLLEGIUM',
}

export default function TierBadge({ tierSlug }: { tierSlug: string }) {
  const key = tierMap[tierSlug]
  if (!key) return null
  const tier = TIERS[key]

  const colorClasses: Record<string, string> = {
    explorer: 'bg-explorer-light text-explorer',
    scholar: 'bg-scholar-light text-scholar',
    collegium: 'bg-collegium-light text-collegium',
  }

  return (
    <span className={`${colorClasses[tier.color]} font-medium px-3 py-1 rounded-full text-sm inline-flex items-center gap-1`}>
      <span>{tier.emoji}</span>
      <span>{tier.name}</span>
    </span>
  )
}
