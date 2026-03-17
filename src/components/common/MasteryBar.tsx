interface Props {
  percentage: number
  label?: string
  color?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function MasteryBar({ percentage, label, color, showLabel = true, size = 'md' }: Props) {
  const barColor = percentage >= 85 ? '#10B981' : percentage >= 60 ? '#F59E0B' : percentage >= 30 ? '#F97316' : '#EF4444'
  const heightClass = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }[size]

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          <span className="text-sm font-medium" style={{ color: color || barColor }}>{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color || barColor }}
        />
      </div>
    </div>
  )
}
