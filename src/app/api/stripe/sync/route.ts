import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/persistence/supabase/server';
import { stripe } from '@/services/payments/stripe';
import { supabaseAdmin } from '@/infra/persistence/supabase-admin';

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

export async function POST(req: NextRequest) {
    // We keep req here for Next.js convention even if unused
    void req;
    
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[Sync] Starting sync for user:', user.id);

        // Get local subscription to find stripe_customer_id
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle to handle no results gracefully

        // First try to get subscriptions from Stripe using customer ID
        let stripeCustomerId = subscription?.stripe_customer_id;

        // If no customer ID in local DB, try to find by email in Stripe
        if (!stripeCustomerId) {
            const customers = await stripe.customers.list({
                email: user.email || undefined,
                limit: 1
            });
            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;
            }
        }

        if (!stripeCustomerId) {
            console.log('[Sync] No Stripe Customer ID found for user:', user.id);
            return new NextResponse('No Stripe Customer ID found', { status: 404 });
        }

        console.log('[Sync] Found Stripe customer:', stripeCustomerId);

        // List subscriptions from Stripe - prioritize active and trialing
        const stripeSubscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            limit: 10, // Get more to find active one
        });

        console.log('[Sync] Found', stripeSubscriptions.data.length, 'subscriptions in Stripe');

        // Find the best subscription (prioritize active > trialing > others)
        let stripeSub: Stripe.Subscription | undefined = stripeSubscriptions.data.find(s => s.status === 'active');
        if (!stripeSub) {
            stripeSub = stripeSubscriptions.data.find(s => s.status === 'trialing');
        }
        if (!stripeSub && stripeSubscriptions.data.length > 0) {
            stripeSub = stripeSubscriptions.data[0]; // Fall back to most recent
        }

        if (!stripeSub) {
            console.log('[Sync] No subscriptions found in Stripe for customer:', stripeCustomerId);
            return NextResponse.json({ message: 'No subscriptions found in Stripe' });
        }

        console.log('[Sync] Using subscription:', stripeSub.id, 'status:', stripeSub.status);

        // Cast to any to access properties that might be missing in the futuristic SDK types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = stripeSub as any;

        // Map Price ID to Plan Type
        const priceId = stripeSub.items.data[0].price.id;
        const planType = getPlanTypeFromPriceId(priceId);
        const mappedStatus = mapStripeStatus(stripeSub.status);

        // Try to get the next invoice date
        let nextInvoiceDate: string | null = null;
        try {
            const upcomingInvoice = await stripe.invoices.createPreview({
                customer: stripeCustomerId,
                subscription: stripeSub.id
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invoice = upcomingInvoice as any;
            if (invoice.next_payment_attempt) {
                nextInvoiceDate = new Date(invoice.next_payment_attempt * 1000).toISOString();
            } else if (sub.current_period_end) {
                nextInvoiceDate = new Date(sub.current_period_end * 1000).toISOString();
            }
            console.log('[Sync] Next invoice date from Stripe:', nextInvoiceDate);
        } catch (invoiceError) {
            void invoiceError;
            console.log('[Sync] No upcoming invoice found, using current_period_end');
            if (sub.current_period_end) {
                nextInvoiceDate = new Date(sub.current_period_end * 1000).toISOString();
            }
        }

        // Upsert to handle both insert and update cases
        const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSub.id,
                status: mappedStatus,
                plan_type: planType,
                trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : new Date().toISOString(),
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                stripe_current_period_end: nextInvoiceDate || (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
                billing_period: 'monthly'
            }, { onConflict: 'user_id' });

        if (upsertError) {
            console.error('[Sync] Error upserting subscription:', upsertError);
            throw upsertError;
        }

        return NextResponse.json({
            message: 'Subscription synced successfully',
            status: mappedStatus,
            plan_type: planType,
            current_period_end: nextInvoiceDate || (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null)
        });

    } catch (error) {
        console.error('[Sync] Error during Stripe sync:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
