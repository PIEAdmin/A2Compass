import { Header } from '../../components/layout'
import { FamilyBilling } from '../../components/billing'

export default function ParentBillingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="💳 Billing & Payments" subtitle="Manage your subscriptions and payment history" />
      <div className="p-6">
        <FamilyBilling />
      </div>
    </div>
  )
}
