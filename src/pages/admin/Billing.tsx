import { Header } from '../../components/layout'
import { AdminBilling } from '../../components/billing'

export default function AdminBillingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="💳 Billing Management" subtitle="Revenue, subscriptions, and scholarship management" />
      <div className="p-6">
        <AdminBilling />
      </div>
    </div>
  )
}
