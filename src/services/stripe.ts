import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { supabase } from './supabase'
import type { StripeProduct, PaymentHistory, SubscriptionSummary, AdminRevenueSummary } from '../types/billing'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null> | null = null
export function getStripe() {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

export const stripeService = {
  // Get available products/pricing
  async getProducts(): Promise<StripeProduct[]> {
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    if (error) { console.error('getProducts error:', error); return [] }
    return data || []
  },

  // Create checkout session via Supabase Edge Function
  async createCheckoutSession(params: {
    priceId: string
    enrollmentTypeId: string
    studentId: string
    parentId: string
    successUrl?: string
    cancelUrl?: string
  }): Promise<{ sessionId: string; url: string } | null> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        price_id: params.priceId,
        enrollment_type_id: params.enrollmentTypeId,
        student_id: params.studentId,
        parent_id: params.parentId,
        success_url: params.successUrl || `${window.location.origin}/parent/billing?success=true`,
        cancel_url: params.cancelUrl || `${window.location.origin}/parent/billing?cancelled=true`,
      }
    })
    if (error) { console.error('createCheckoutSession error:', error); return null }
    return data
  },

  // Open Stripe Customer Portal for managing payment methods
  async openCustomerPortal(parentId: string): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        parent_id: parentId,
        return_url: `${window.location.origin}/parent/billing`,
      }
    })
    if (error) { console.error('openCustomerPortal error:', error); return null }
    return data?.url || null
  },

  // Get payment history for a parent
  async getPaymentHistory(parentId: string): Promise<PaymentHistory[]> {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
    if (error) { console.error('getPaymentHistory error:', error); return [] }
    return data || []
  },

  // Get subscription summaries for a parent
  async getSubscriptions(parentId: string): Promise<SubscriptionSummary[]> {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        status,
        stripe_subscription_id,
        enrollment_type:enrollment_types(name, slug),
        student:student_profiles(*, profile:profiles!student_profiles_user_id_fkey(*))
      `)
      .eq('student.parent_id', parentId)
      .in('status', ['active', 'trial', 'past_due'])
    if (error) { console.error('getSubscriptions error:', error); return [] }

    return (data || []).map((e: any) => ({
      enrollmentId: e.id,
      studentName: e.student?.profile?.full_name || 'Unknown',
      enrollmentType: e.enrollment_type?.name || 'Unknown',
      status: e.status,
      amount: 0, // Will be populated from Stripe
      interval: 'monthly',
      nextPaymentDate: null,
      stripeSubscriptionId: e.stripe_subscription_id,
    }))
  },

  // Admin: Get revenue summary
  async getRevenueSummary(): Promise<AdminRevenueSummary> {
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('*, enrollment_type:enrollment_types(*)')

    const active = (enrollments || []).filter(e => e.status === 'active' || e.status === 'trial')
    const delinquent = (enrollments || []).filter(e => e.status === 'past_due')

    const byType = active.reduce((acc: Record<string, { count: number }>, e: any) => {
      const type = e.enrollment_type?.name || 'Unknown'
      if (!acc[type]) acc[type] = { count: 0 }
      acc[type].count++
      return acc
    }, {})

    return {
      totalRevenue: 0, // Will be populated from Stripe dashboard
      monthlyRecurring: 0,
      activeSubscriptions: active.length,
      delinquentAccounts: delinquent.length,
      revenueByType: Object.entries(byType).map(([type, data]: [string, any]) => ({
        type,
        amount: 0,
        count: data.count,
      })),
    }
  },
}
