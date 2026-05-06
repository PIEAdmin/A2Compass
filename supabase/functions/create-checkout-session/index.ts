import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ── Tier → slug mapping ─────────────────────────────────── */
function getPackageSlug(tier: string, interval: string): string {
  const map: Record<string, string> = {
    'spark-monthly': 'spark-monthly',
    'spark-annual': 'spark-annual',
    'launch-monthly': 'launch-monthly',
    'launch-annual': 'launch-annual',
    'launch-founders-monthly': 'launch-founders',
    'launch-founders-annual': 'launch-founders',
  }
  return map[`${tier}-${interval}`] || tier
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    let priceId: string
    let checkoutMode: 'subscription' | 'payment' = 'subscription'
    let parentId: string

    /* ── New format: { tier, interval, userId } ───────────── */
    if (body.tier) {
      const slug = getPackageSlug(body.tier, body.interval || 'monthly')
      const { data: pkg, error: pkgErr } = await supabase
        .from('pricing_packages')
        .select('stripe_price_id, billing_type')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (pkgErr || !pkg?.stripe_price_id) {
        throw new Error(`No active pricing package found for "${slug}"`)
      }

      priceId = pkg.stripe_price_id
      checkoutMode = pkg.billing_type === 'one_time' ? 'payment' : 'subscription'
      parentId = body.userId
    }
    /* ── Legacy format: { price_id, parent_id, mode, ... } ── */
    else {
      priceId = body.price_id
      checkoutMode = body.mode === 'subscription' ? 'subscription' : 'payment'
      parentId = body.parent_id
    }

    const successUrl = body.success_url || 'https://aaacademy.app/parent?enrolled=true'
    const cancelUrl = body.cancel_url || 'https://aaacademy.app/parent/enroll'

    /* ── Get or create Stripe customer ────────────────────── */
    let { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', parentId)
      .single()

    if (!customer) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', parentId)
        .single()

      const stripeCustomer = await stripe.customers.create({
        email: profile?.email,
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { supabase_user_id: parentId },
      })

      await supabase.from('stripe_customers').insert({
        user_id: parentId,
        stripe_customer_id: stripeCustomer.id,
      })

      customer = { stripe_customer_id: stripeCustomer.id }
    }

    /* ── Create Stripe Checkout Session ───────────────────── */
    const session = await stripe.checkout.sessions.create({
      customer: customer.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: checkoutMode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        enrollment_type_id: body.enrollment_type_id || '',
        student_id: body.student_id || '',
        parent_id: parentId,
        tier: body.tier || '',
      },
    })

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
