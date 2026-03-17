// src/components/parent/AgeBenchmarks.tsx
// Shows age-appropriate skill expectations so parents understand context

interface BenchmarkDomain {
  domain: string
  icon: string
  typicalSkills: string
  childLevel: string
  status: 'above' | 'at' | 'below' | 'not-assessed'
}

interface AgeBenchmarksProps {
  studentName: string
  age: number
  benchmarks: BenchmarkDomain[]
}

const statusConfig = {
  above: { label: 'Above Typical', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🌟' },
  at: { label: 'On Track', color: 'text-blue-600', bg: 'bg-blue-50', icon: '✅' },
  below: { label: 'Building Up', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🔨' },
  'not-assessed': { label: 'Not Yet Assessed', color: 'text-gray-400', bg: 'bg-gray-50', icon: '⏳' },
}

export default function AgeBenchmarks({ studentName, age, benchmarks }: AgeBenchmarksProps) {
  const firstName = studentName.split(' ')[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-compass-navy">
          📊 Where {firstName} Stands
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Compared to typical expectations for age {age}
        </p>
      </div>

      {/* Positive framing note */}
      <div className="bg-blue-50 rounded-lg px-4 py-3 mb-5 text-sm text-blue-700">
        💡 Every child learns differently. These benchmarks help us focus on what {firstName} needs next — 
        not where they "should" be. Progress is what matters most!
      </div>

      <div className="space-y-3">
        {benchmarks.map((b) => {
          const config = statusConfig[b.status]
          return (
            <div key={b.domain} className={`${config.bg} rounded-lg p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{b.icon}</span>
                    <span className="font-medium text-gray-800">{b.domain}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Typical for age {age}: {b.typicalSkills}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {firstName}'s level: <span className="font-medium">{b.childLevel}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${config.color} ${config.bg}`}>
                  {config.icon} {config.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Re-assessment reminder */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          🔄 Benchmarks update automatically as {firstName} completes assessments. 
          Next full re-assessment recommended in 4-6 weeks.
        </p>
      </div>
    </div>
  )
}
