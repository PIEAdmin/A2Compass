import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { stripeService } from '../../services/stripe';
import { billingService } from '../../services/billing.service';
import { Link } from 'react-router-dom';
import type { FoundersAccount, FamilyDiscount } from '../../types/billing';

interface SubscriptionSummary {
  enrollmentId: string;
  studentName: string;
  enrollmentType: string;
  status: string;
  amount: number;
  interval: string;
  nextPaymentDate: string | null;
  stripeSubscriptionId: string | null;
}

interface PaymentHistoryItem {
  id: string;
  parent_id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  trial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Trial' },
  past_due: { bg: 'bg-red-100', text: 'text-red-700', label: 'Past Due' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ParentBilling() {
  const { user } = useAuth();
  const parentId = user?.id || '';
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [foundersAccount, setFoundersAccount] = useState<FoundersAccount | null>(null);
  const [familyDiscounts, setFamilyDiscounts] = useState<FamilyDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadBillingData();
  }, [user]);

  async function loadBillingData() {
    setLoading(true);
    setError(null);
    try {
      const [subsData, paymentsData, foundersData, discountsData] = await Promise.all([
        stripeService.getSubscriptions(parentId),
        stripeService.getPaymentHistory(parentId),
        billingService.getFoundersAccount(parentId).catch(() => null),
        billingService.getFamilyDiscounts(parentId).catch(() => []),
      ]);
      setSubscriptions(subsData as SubscriptionSummary[]);
      setPayments(paymentsData as PaymentHistoryItem[]);
      setFoundersAccount(foundersData);
      setFamilyDiscounts(discountsData);
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      setError(err?.message || 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    try {
      const url = await stripeService.openCustomerPortal(parentId);
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Something went wrong loading billing.</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💳 Billing & Subscriptions</h1>
            <p className="text-gray-500 mt-1">Manage your family's enrollment and payments</p>
          </div>
          <button
            onClick={handleManageBilling}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Manage Payment Methods
          </button>
        </div>

        {/* Founders Rate Banner */}
        {foundersAccount && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl shadow-sm border border-amber-200 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="font-bold text-amber-900">Founders' Rate — Pricing Locked!</h2>
                <p className="text-sm text-amber-700 mt-0.5">
                  Family #{foundersAccount.founders_number} · {foundersAccount.family_name} · Locked since{' '}
                  {formatDate(foundersAccount.rate_locked_at)}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Your pricing stays locked as long as enrollment remains continuous. Thank you for being an early supporter!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Family Discounts */}
        {familyDiscounts.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👨‍👩‍👧‍👦</span>
              <h3 className="font-semibold text-blue-900">Family Discount Active</h3>
            </div>
            <div className="space-y-1">
              {familyDiscounts.map((disc) => (
                <p key={disc.id} className="text-sm text-blue-700">
                  Child #{disc.child_order}: {disc.discount_percent}% discount applied
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Current Subscriptions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Current Subscriptions</h2>
          {subscriptions.length > 0 ? (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const badge = STATUS_BADGES[sub.status] || STATUS_BADGES.active;
                return (
                  <div key={sub.enrollmentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">
                        👩‍🎓
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{sub.studentName}</h3>
                        <p className="text-sm text-gray-500">{sub.enrollmentType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {sub.nextPaymentDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          Next payment: {formatDate(sub.nextPaymentDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No active subscriptions</p>
              <Link
                to="/parent/enroll"
                className="inline-block mt-3 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Enroll Now
              </Link>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 Payment History</h2>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Amount</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-3 text-gray-600">{formatDate(payment.created_at)}</td>
                      <td className="py-3 px-3 text-gray-800">{payment.description}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {payment.status === 'succeeded' ? 'Paid' : payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No payment history yet</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-600">Need to add another child or change plans?</p>
          <Link
            to="/parent/enroll"
            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition-colors text-sm"
          >
            📋 Enrollment Options
          </Link>
        </div>
      </div>
    </div>
  );
}
