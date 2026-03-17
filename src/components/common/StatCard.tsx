interface Props {
  label: string
  value: string | number
  icon: string
  change?: { value: string; positive: boolean }
  color?: string
}

export default function StatCard({ label, value, icon, change, color = '#3B82F6' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${change.positive ? 'text-green-600' : 'text-red-500'}`}>
              {change.positive ? '↑' : '↓'} {change.value}
            </p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
