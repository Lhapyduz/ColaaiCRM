import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe, getStripeCustomer } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const { newPriceId, newPlanType } = await req.json();

        if (!newPriceId || !newPlanType) {
            return new NextResponse('Missing newPriceId or newPlanType', { status: 400 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get existing subscription
        const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get or create Stripe customer
        const customer = await getStripeCustomer(user.id, user.email, user.user_metadata?.full_name);

        if (!customer) {
            return new NextResponse('Customer creation failed', { status: 500 });
        }

        // Cancel existing subscription if present
        if (existingSub?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(existingSub.stripe_subscription_id);
                console.log(`Cancelled old subscription: ${existingSub.stripe_subscription_id}`);
            } catch (err) {
                console.error('Failed to cancel old subscription:', err);
                // Continue anyway - might already be cancelled
            }
        }

        // Create new subscription with 7-day trial
        const newSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: newPriceId }],
            trial_period_days: 7,
            metadata: {
                userId: user.id,
                planType: newPlanType,
            },
        });

        // Update Supabase with new subscription
        const sub = newSubscription as unknown as { current_period_start: number; current_period_end: number };
        await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                stripe_customer_id: customer.id,
                stripe_subscription_id: newSubscription.id,
                stripe_price_id: newPriceId,
                plan_type: newPlanType,
                status: newSubscription.status === 'trialing' ? 'trial' : newSubscription.status,
                trial_ends_at: newSubscription.trial_end
                    ? new Date(newSubscription.trial_end * 1000).toISOString()
                    : null,
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                stripe_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                billing_period: 'monthly'
            } as Record<string, unknown>, { onConflict: 'user_id' });

        return NextResponse.json({
            success: true,
            message: 'Plano alterado com sucesso',
            newPlan: newPlanType,
            trialEnds: newSubscription.trial_end
                ? new Date(newSubscription.trial_end * 1000).toISOString()
                : null
        });

    } catch (error) {
        console.error('Change plan error:', error);
        return new NextResponse(`Internal Error: ${(error as Error).message}`, { status: 500 });
    }
}
