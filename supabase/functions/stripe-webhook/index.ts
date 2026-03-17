// Supabase Edge Function: Stripe Webhook Handler
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Log the event
  await supabase.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { enrollment_type_id, student_id } = session.metadata || {}

        if (enrollment_type_id && student_id) {
          // Create or activate enrollment
          await supabase.from('student_enrollments').upsert({
            student_id,
            enrollment_type_id,
            status: 'active',
            start_date: new Date().toISOString(),
            stripe_subscription_id: session.subscription as string || null,
          }, { onConflict: 'student_id,enrollment_type_id' })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        if (subscriptionId) {
          await supabase.from('student_enrollments')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId)
        }

        // Record payment
        await supabase.from('payment_history').insert({
          parent_id: invoice.metadata?.parent_id,
          stripe_payment_intent_id: invoice.payment_intent as string,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          description: `Invoice ${invoice.number}`,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        if (subscriptionId) {
          await supabase.from('student_enrollments')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase.from('student_enrollments')
          .update({ status: 'cancelled', end_date: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status = subscription.status === 'active' ? 'active' :
                       subscription.status === 'past_due' ? 'past_due' :
                       subscription.status === 'canceled' ? 'cancelled' : 'paused'
        await supabase.from('student_enrollments')
          .update({ status })
          .eq('stripe_subscription_id', subscription.id)
        break
      }
    }

    // Mark event as processed
    await supabase.from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id)

  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
