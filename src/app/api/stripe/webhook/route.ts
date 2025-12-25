import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

// Map Stripe subscription status to Supabase status
function mapStripeStatus(stripeStatus: string): string {
    switch (stripeStatus) {
        case 'trialing':
            return 'trial';
        case 'active':
            return 'active';
        case 'canceled':
        case 'cancelled':
            return 'cancelled';
        case 'past_due':
        case 'unpaid':
            return 'expired';
        default:
            return stripeStatus;
    }
}

// Derive plan type from Stripe price ID
function getPlanTypeFromPriceId(priceId: string): string {
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) return 'Basico';
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL) return 'Avançado';
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) return 'Profissional';
    return 'Basico'; // Default fallback
}

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error(`Webhook signature verification failed: ${error.message}`);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const subscription = event.data.object as Stripe.Subscription;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const userId = session.metadata?.userId;
                const planType = session.metadata?.planType;

                console.log('[WEBHOOK] === checkout.session.completed ===');
                console.log('[WEBHOOK] session.id:', session.id);
                console.log('[WEBHOOK] userId:', userId);
                console.log('[WEBHOOK] planType:', planType);
                console.log('[WEBHOOK] customer:', session.customer);
                console.log('[WEBHOOK] subscription:', session.subscription);

                if (!userId) {
                    console.error('[WEBHOOK] Missing userId in session metadata');
                    break;
                }

                const subscriptionId = session.subscription as string;

                if (!subscriptionId) {
                    console.error('[WEBHOOK] No subscriptionId in session - might be a one-time payment');
                    break;
                }

                // Handle old subscription cancellation (Upgrade/Downgrade flow)
                console.log('[WEBHOOK] Checking for existing subscriptions to cancel...');
                const { data: existingSubs, error: selectError } = await supabaseAdmin
                    .from('subscriptions')
                    .select('stripe_subscription_id')
                    .eq('user_id', userId)
                    .neq('stripe_subscription_id', subscriptionId)
                    .in('status', ['active', 'trialing', 'trial']);

                if (selectError) {
                    console.error('[WEBHOOK] Error fetching existing subs:', selectError);
                }

                console.log('[WEBHOOK] Found existing subs to cancel:', existingSubs?.length || 0);

                if (existingSubs && existingSubs.length > 0) {
                    for (const oldSub of existingSubs) {
                        if (oldSub.stripe_subscription_id) {
                            try {
                                await stripe.subscriptions.cancel(oldSub.stripe_subscription_id);
                                console.log(`[WEBHOOK] Cancelled old subscription: ${oldSub.stripe_subscription_id}`);
                            } catch (err: any) {
                                console.error(`[WEBHOOK] Failed to cancel old subscription ${oldSub.stripe_subscription_id}:`, err.message);
                            }
                        }
                    }
                }

                // Fetch subscription details to get current period end
                console.log('[WEBHOOK] Fetching subscription details from Stripe...');
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = (sub as any).items.data[0].price.id;

                console.log('[WEBHOOK] Subscription status:', sub.status);
                console.log('[WEBHOOK] Price ID:', priceId);

                // Derive planType from priceId if not in metadata
                const finalPlanType = planType || getPlanTypeFromPriceId(priceId);
                console.log('[WEBHOOK] Final plan type:', finalPlanType);

                // Prepare dates with validation
                const now = new Date().toISOString();
                const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
                const periodStart = (sub as any).current_period_start ? new Date((sub as any).current_period_start * 1000).toISOString() : now;
                const periodEnd = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : now;

                console.log('[WEBHOOK] Upserting to Supabase...');
                const { data: upsertData, error: upsertError } = await supabaseAdmin
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: subscriptionId,
                        stripe_price_id: priceId,
                        plan_type: finalPlanType,
                        status: mapStripeStatus(sub.status),
                        trial_ends_at: trialEndsAt,
                        current_period_start: periodStart,
                        current_period_end: periodEnd,
                        stripe_current_period_end: periodEnd,
                        billing_period: 'monthly'
                    } as any, { onConflict: 'user_id' })
                    .select();

                if (upsertError) {
                    console.error('[WEBHOOK] Supabase upsert error:', upsertError);
                } else {
                    console.log('[WEBHOOK] Supabase upsert SUCCESS:', upsertData);
                }

                break;
            }

            case 'customer.subscription.updated': {
                // Handle subscription update
                const sub = event.data.object as Stripe.Subscription;
                const stripeCustomerId = sub.customer as string;
                const priceId = sub.items.data[0].price.id;

                // Start by finding the user associated with this customer
                const { data: userData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (userData) {
                    // Determine plan type from price ID using helper
                    const newPlanType = getPlanTypeFromPriceId(priceId);

                    await supabaseAdmin
                        .from('subscriptions')
                        .update({
                            stripe_subscription_id: sub.id,
                            status: mapStripeStatus(sub.status),
                            plan_type: newPlanType,
                            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
                            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
                            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                            stripe_current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                            stripe_price_id: priceId
                        } as any)
                        .eq('user_id', userData.user_id);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                const stripeCustomerId = sub.customer as string;

                const { data: userData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (userData) {
                    await supabaseAdmin
                        .from('subscriptions')
                        .update({
                            status: 'cancelled'
                        } as any)
                        .eq('user_id', userData.user_id);
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error handling webhook event:', error);
        return new NextResponse('Webhook handler failed', { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
