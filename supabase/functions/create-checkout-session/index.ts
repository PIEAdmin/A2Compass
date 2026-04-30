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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { price_id, enrollment_type_id, student_id, parent_id, mode, success_url, cancel_url } = await req.json()

    // Get or create Stripe customer
    let { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', parent_id)
      .single()

    if (!customer) {
      // Look up parent's profile - try profiles table with user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_id', parent_id)
        .single()

      const stripeCustomer = await stripe.customers.create({
        email: profile?.email,
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { supabase_user_id: parent_id },
      })

      await supabase.from('stripe_customers').insert({
        user_id: parent_id,
        stripe_customer_id: stripeCustomer.id,
      })

      customer = { stripe_customer_id: stripeCustomer.id }
    }

    // Determine checkout mode from request (default to payment)
    const checkoutMode = mode === 'subscription' ? 'subscription' : 'payment'

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripe_customer_id,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: checkoutMode,
      success_url,
      cancel_url,
      metadata: {
        enrollment_type_id,
        student_id,
        parent_id,
      },
    })

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
