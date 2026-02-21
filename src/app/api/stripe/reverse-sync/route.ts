import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Webhook secret for verification (set in Supabase Database Webhook config)
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

interface SubscriptionRecord {
    id: string;
    user_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    stripe_price_id: string;
    status: string;
    plan_type: string;
    sync_source: string;
}

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    record: SubscriptionRecord;
    old_record: SubscriptionRecord | null;
}

// Map app plan type to Stripe price ID
function getPriceIdFromPlanType(planType: string): string | null {
    if (planType === 'Basico') return process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || null;
    if (planType === 'Avançado') return process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL || null;
    if (planType === 'Profissional') return process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || null;
    return null;
}

export async function POST(req: NextRequest) {
    try {
        // Verify webhook secret if configured
        if (WEBHOOK_SECRET) {
            const authHeader = req.headers.get('x-webhook-secret');
            if (authHeader !== WEBHOOK_SECRET) {
                console.error('[Reverse Sync] Invalid webhook secret');
                return new NextResponse('Unauthorized', { status: 401 });
            }
        }

        const payload: WebhookPayload = await req.json();
        console.log(`[Reverse Sync] Received payload for table: ${payload.table}, type: ${payload.type}`);

        const { record, old_record } = payload;

        // Skip if no Stripe subscription ID
        if (!record.stripe_subscription_id) {
            console.log('[Reverse Sync] No Stripe subscription ID, skipping');
            return NextResponse.json({ message: 'No Stripe subscription ID' });
        }

        // Skip if sync came from Stripe (prevent loops)
        if (record.sync_source === 'stripe') {
            console.log('[Reverse Sync] Sync source is stripe, skipping to prevent loop');
            return NextResponse.json({ message: 'Skipping - source is stripe' });
        }

        let result: Stripe.Subscription | null = null;

        // Handle cancellation
        if (record.status === 'cancelled' && old_record?.status !== 'cancelled') {
            console.log('[Reverse Sync] Cancelling subscription in Stripe:', record.stripe_subscription_id);
            try {
                result = await stripe.subscriptions.cancel(record.stripe_subscription_id);
            } catch (err: unknown) {
                // Subscription might already be cancelled
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                console.log('[Reverse Sync] Cancel failed (might already be cancelled):', errorMsg);
            }
        }

        // Handle plan changes
        if (old_record && record.plan_type !== old_record.plan_type) {
            const newPriceId = getPriceIdFromPlanType(record.plan_type);

            if (newPriceId) {
                console.log('[Reverse Sync] Updating subscription plan in Stripe:', record.stripe_subscription_id);

                try {
                    // Get current subscription to find item ID
                    const subscription = await stripe.subscriptions.retrieve(record.stripe_subscription_id);
                    const itemId = subscription.items.data[0]?.id;

                    if (itemId) {
                        result = await stripe.subscriptions.update(record.stripe_subscription_id, {
                            items: [{
                                id: itemId,
                                price: newPriceId,
                            }],
                            proration_behavior: 'create_prorations',
                        });
                    }
                } catch (err: unknown) {
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    console.error('[Reverse Sync] Plan update failed:', errorMsg);
                }
            }
        }

        // Update last_synced_at in Supabase (with sync_source = 'stripe' to prevent re-triggering)
        if (result) {
            await supabaseAdmin
                .from('subscriptions')
                .update({
                    last_synced_at: new Date().toISOString(),
                    sync_source: 'stripe' // Prevent loop
                })
                .eq('id', record.id);
        }

        console.log('[Reverse Sync] Completed:', result?.id || 'no action taken');

        return NextResponse.json({
            success: true,
            message: 'Reverse sync completed',
            stripe_result: result?.id
        });

    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Reverse Sync] Error:', errorMsg);
        return new NextResponse(`Error: ${errorMsg}`, { status: 500 });
    }
}
