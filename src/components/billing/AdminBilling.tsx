import { useState, useEffect } from 'react'
import { stripeService } from '../../services/stripe'
import { StatCard, LoadingSpinner } from '../common'
import type { AdminRevenueSummary } from '../../types/billing'

export default function AdminBilling() {
  const [summary, setSummary] = useState<AdminRevenueSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    stripeService.getRevenueSummary().then((data) => {
      setSummary(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />
  if (!summary) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Subscriptions" value={summary.activeSubscriptions} icon="✅" color="#10B981" />
        <StatCard label="Delinquent" value={summary.delinquentAccounts} icon="⚠️" color={summary.delinquentAccounts > 0 ? '#EF4444' : '#10B981'} />
        <StatCard label="MRR" value={summary.monthlyRecurring > 0 ? `$${summary.monthlyRecurring}` : 'Set up pricing'} icon="💰" color="#3B82F6" />
        <StatCard label="Total Revenue" value={summary.totalRevenue > 0 ? `$${summary.totalRevenue}` : 'Pending'} icon="📈" color="#8B5CF6" />
      </div>

      {/* Revenue by Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-compass-navy mb-4">📊 Enrollment Breakdown</h3>
        {summary.revenueByType.length === 0 ? (
          <p className="text-gray-500 text-sm">No enrollment data yet</p>
        ) : (
          <div className="space-y-3">
            {summary.revenueByType.map(({ type, count }) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-800">{type}</span>
                <span className="text-sm text-gray-600">{count} students</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scholarship / Manual Override */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-compass-navy mb-4">🎓 Scholarships & Overrides</h3>
        <p className="text-sm text-gray-500 mb-4">
          Grant free access to students (e.g., pilot students, scholarships). Scholarship students bypass payment requirements.
        </p>
        <button className="btn-primary text-sm">
          + Grant Scholarship Access
        </button>
      </div>
    </div>
  )
}
