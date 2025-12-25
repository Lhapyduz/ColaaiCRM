// @ts-nocheck - This is a Deno Edge Function, IDE errors are expected
// Supabase Edge Function: stripe-sync
// Syncs subscription changes FROM Supabase TO Stripe

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionRecord {
    id: string
    user_id: string
    stripe_subscription_id: string
    stripe_customer_id: string
    stripe_price_id: string
    status: string
    plan_type: string
    sync_source: string
}

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    record: SubscriptionRecord
    old_record: SubscriptionRecord | null
}

// Map app status to Stripe actions
function getStripeAction(newStatus: string, oldStatus: string | undefined): string | null {
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        return 'cancel'
    }
    if (newStatus === 'active' && oldStatus === 'cancelled') {
        return 'reactivate' // Note: Stripe doesn't support reactivation directly
    }
    return null
}

// Map app plan type to Stripe price ID
function getPriceIdFromPlanType(planType: string): string | null {
    const priceMap: Record<string, string | undefined> = {
        'Basico': Deno.env.get('STRIPE_PRICE_BASIC'),
        'Avançado': Deno.env.get('STRIPE_PRICE_PROFESSIONAL'),
        'Profissional': Deno.env.get('STRIPE_PRICE_ENTERPRISE'),
    }
    return priceMap[planType] || null
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload: WebhookPayload = await req.json()
        console.log('Received sync request:', JSON.stringify(payload, null, 2))

        const { type, record, old_record } = payload

        // Skip if no Stripe subscription ID
        if (!record.stripe_subscription_id) {
            console.log('No Stripe subscription ID, skipping sync')
            return new Response(
                JSON.stringify({ message: 'No Stripe subscription ID' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Skip if sync came from Stripe (prevent loops)
        if (record.sync_source === 'stripe') {
            console.log('Sync source is stripe, skipping to prevent loop')
            return new Response(
                JSON.stringify({ message: 'Skipping - source is stripe' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        let result: any = null

        // Handle status changes
        const action = getStripeAction(record.status, old_record?.status)

        if (action === 'cancel') {
            console.log('Cancelling subscription in Stripe:', record.stripe_subscription_id)
            result = await stripe.subscriptions.cancel(record.stripe_subscription_id)
        }

        // Handle plan changes
        if (old_record && record.plan_type !== old_record.plan_type) {
            const newPriceId = getPriceIdFromPlanType(record.plan_type)

            if (newPriceId) {
                console.log('Updating subscription plan in Stripe:', record.stripe_subscription_id)

                // Get current subscription to find item ID
                const subscription = await stripe.subscriptions.retrieve(record.stripe_subscription_id)
                const itemId = subscription.items.data[0]?.id

                if (itemId) {
                    result = await stripe.subscriptions.update(record.stripe_subscription_id, {
                        items: [{
                            id: itemId,
                            price: newPriceId,
                        }],
                        proration_behavior: 'create_prorations',
                    })
                }
            }
        }

        console.log('Stripe sync completed:', result?.id || 'no action taken')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Sync completed',
                stripe_result: result?.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Stripe sync error:', error)
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
