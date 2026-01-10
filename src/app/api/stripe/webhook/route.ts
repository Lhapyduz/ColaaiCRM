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

                // Get the exact next invoice date from Stripe
                let nextInvoiceDate = periodEnd;
                try {
                    const upcomingInvoice = await stripe.invoices.createPreview({
                        customer: session.customer as string,
                        subscription: subscriptionId
                    } as any);
                    if (upcomingInvoice.next_payment_attempt) {
                        nextInvoiceDate = new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString();
                        console.log('[WEBHOOK] Next invoice date from Stripe:', nextInvoiceDate);
                    } else if ((upcomingInvoice as any).period_end) {
                        nextInvoiceDate = new Date((upcomingInvoice as any).period_end * 1000).toISOString();
                        console.log('[WEBHOOK] Using period_end from invoice:', nextInvoiceDate);
                    }
                } catch (invoiceError: any) {
                    console.log('[WEBHOOK] Could not get upcoming invoice, using current_period_end:', invoiceError.message);
                }

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
                        stripe_current_period_end: nextInvoiceDate,
                        billing_period: 'monthly'
                    } as any, { onConflict: 'user_id' })
                    .select();

                if (upsertError) {
                    console.error('[WEBHOOK] Supabase upsert error:', upsertError);
                } else {
                    console.log('[WEBHOOK] Supabase upsert SUCCESS:', upsertData);

                    // If subscription is in trial, record the used trial
                    if (sub.status === 'trialing' && sub.trial_end) {
                        console.log('[WEBHOOK] Recording used trial for plan:', finalPlanType);
                        const { error: trialError } = await supabaseAdmin
                            .from('used_trials')
                            .upsert({
                                user_id: userId,
                                plan_type: finalPlanType,
                                stripe_subscription_id: subscriptionId,
                                used_at: new Date().toISOString()
                            }, { onConflict: 'user_id,plan_type' });

                        if (trialError) {
                            console.error('[WEBHOOK] Error recording used trial:', trialError);
                        } else {
                            console.log('[WEBHOOK] Used trial recorded successfully');
                        }
                    }
                }

                break;
            }

            case 'customer.subscription.updated': {
                // Handle subscription update
                const sub = event.data.object as Stripe.Subscription;
                const stripeCustomerId = sub.customer as string;
                const priceId = sub.items.data[0].price.id;

                console.log('[WEBHOOK] customer.subscription.updated - Status:', sub.status);

                // Start by finding the user associated with this customer
                const { data: userData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (userData) {
                    // Determine plan type from price ID using helper
                    const newPlanType = getPlanTypeFromPriceId(priceId);

                    // Get the exact next invoice date from Stripe
                    let nextInvoiceDate = new Date((sub as any).current_period_end * 1000).toISOString();
                    try {
                        const upcomingInvoice = await stripe.invoices.createPreview({
                            customer: stripeCustomerId,
                            subscription: sub.id
                        } as any);
                        if (upcomingInvoice.next_payment_attempt) {
                            nextInvoiceDate = new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString();
                        } else if ((upcomingInvoice as any).period_end) {
                            nextInvoiceDate = new Date((upcomingInvoice as any).period_end * 1000).toISOString();
                        }
                        console.log('[WEBHOOK] Next invoice date:', nextInvoiceDate);
                    } catch (invoiceError: any) {
                        console.log('[WEBHOOK] Could not get upcoming invoice:', invoiceError.message);
                    }

                    await supabaseAdmin
                        .from('subscriptions')
                        .update({
                            stripe_subscription_id: sub.id,
                            status: mapStripeStatus(sub.status),
                            plan_type: newPlanType,
                            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
                            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
                            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                            stripe_current_period_end: nextInvoiceDate,
                            stripe_price_id: priceId
                        } as any)
                        .eq('user_id', userData.user_id);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                const stripeCustomerId = sub.customer as string;
                const deletedSubscriptionId = sub.id;

                console.log('[WEBHOOK] customer.subscription.deleted - Subscription:', deletedSubscriptionId);

                // Find the user's current subscription
                const { data: userData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id, stripe_subscription_id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (userData) {
                    // Only mark as cancelled if the deleted subscription is the current one
                    // If it's an old subscription being cancelled during a plan change, ignore it
                    if (userData.stripe_subscription_id === deletedSubscriptionId) {
                        console.log('[WEBHOOK] Current subscription deleted, marking as cancelled');
                        await supabaseAdmin
                            .from('subscriptions')
                            .update({
                                status: 'cancelled'
                            } as any)
                            .eq('user_id', userData.user_id);
                    } else {
                        console.log('[WEBHOOK] Old subscription deleted (plan change), ignoring. Current:', userData.stripe_subscription_id);
                    }
                }
                break;
            }

            case 'invoice.paid': {
                // Handle subscription renewal - update period dates
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId = invoice.customer as string;
                const subscriptionId = (invoice as any).subscription as string;

                console.log('[WEBHOOK] invoice.paid - Processing renewal');
                console.log('[WEBHOOK] Customer:', stripeCustomerId);
                console.log('[WEBHOOK] Subscription:', subscriptionId);

                if (subscriptionId) {
                    // Fetch the updated subscription from Stripe
                    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
                    const priceId = stripeSub.items.data[0].price.id;

                    const { data: userData } = await supabaseAdmin
                        .from('subscriptions')
                        .select('user_id')
                        .eq('stripe_customer_id', stripeCustomerId)
                        .single();

                    if (userData) {
                        const { error } = await supabaseAdmin
                            .from('subscriptions')
                            .update({
                                status: mapStripeStatus(stripeSub.status),
                                plan_type: getPlanTypeFromPriceId(priceId),
                                trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
                                current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
                                current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
                                stripe_current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
                            } as any)
                            .eq('user_id', userData.user_id);

                        if (error) {
                            console.error('[WEBHOOK] Error updating subscription on invoice.paid:', error);
                        } else {
                            console.log('[WEBHOOK] Successfully updated subscription after invoice.paid');
                        }
                    }
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
