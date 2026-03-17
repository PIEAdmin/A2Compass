import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks'
import { stripeService } from '../../services/stripe'
import { LoadingSpinner, EmptyState } from '../common'
import type { SubscriptionSummary, PaymentHistory } from '../../types/billing'

export default function FamilyBilling() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([])
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      stripeService.getSubscriptions(user.id),
      stripeService.getPaymentHistory(user.id),
    ]).then(([subs, pays]) => {
      setSubscriptions(subs)
      setPayments(pays)
      setLoading(false)
    })
  }, [user])

  const handleManagePayment = async () => {
    if (!user) return
    const url = await stripeService.openCustomerPortal(user.id)
    if (url) window.location.href = url
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-compass-navy">📋 Active Subscriptions</h3>
          <button
            onClick={handleManagePayment}
            className="text-sm text-compass-blue hover:underline"
          >
            Manage Payment Method
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No active subscriptions"
            description="Enroll your child to get started"
          />
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.enrollmentId} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium text-gray-800">{sub.studentName}</p>
                  <p className="text-sm text-gray-500">{sub.enrollmentType}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sub.status === 'active' ? 'bg-green-100 text-green-700' :
                    sub.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                    sub.status === 'past_due' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{sub.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-compass-navy mb-4">💰 Payment History</h3>

        {payments.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 text-gray-600 font-medium">Date</th>
                  <th className="py-2 text-gray-600 font-medium">Description</th>
                  <th className="py-2 text-gray-600 font-medium">Amount</th>
                  <th className="py-2 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-50">
                    <td className="py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="py-2">{payment.description || 'Payment'}</td>
                    <td className="py-2 font-medium">${(payment.amount / 100).toFixed(2)}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{payment.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
