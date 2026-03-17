export interface StripeProduct {
  id: string
  enrollment_type_id: string
  stripe_product_id: string
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  stripe_price_id_one_time: string | null
  price_monthly: number | null
  price_yearly: number | null
  price_one_time: number | null
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaymentHistory {
  id: string
  parent_id: string
  student_enrollment_id: string
  stripe_payment_intent_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed' | 'refunded'
  description: string | null
  created_at: string
}

export interface BillingDashboardData {
  activeSubscriptions: SubscriptionSummary[]
  paymentHistory: PaymentHistory[]
  totalMonthlySpend: number
}

export interface SubscriptionSummary {
  enrollmentId: string
  studentName: string
  enrollmentType: string
  status: string
  amount: number
  interval: string
  nextPaymentDate: string | null
  stripeSubscriptionId: string | null
}

export interface AdminRevenueSummary {
  totalRevenue: number
  monthlyRecurring: number
  activeSubscriptions: number
  delinquentAccounts: number
  revenueByType: { type: string; amount: number; count: number }[]
}
