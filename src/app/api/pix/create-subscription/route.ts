import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe, getStripeCustomer } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLAN_PRICES, PlanPriceKey } from '@/lib/pix-config';
import { sendTelegramNotification, formatPixTelegramMessage } from '@/lib/telegram';

// Map plan type to Stripe price ID
function getPriceIdFromPlanType(planType: string): string | undefined {
    switch (planType) {
        case 'Basico':
            return process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC;
        case 'Avançado':
            return process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL;
        case 'Profissional':
            return process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE;
        default:
            return undefined;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { planType, amount } = await req.json();

        // Validate input
        if (!planType || !amount) {
            return new NextResponse('Missing planType or amount', { status: 400 });
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[PIX API] Creating Stripe subscription for user:', user.id, 'Plan:', planType);

        // Get or create Stripe customer
        const customer = await getStripeCustomer(user.id, user.email, user.user_metadata?.full_name);

        if (!customer) {
            return new NextResponse('Failed to create Stripe customer', { status: 500 });
        }

        console.log('[PIX API] Stripe customer:', customer.id);

        // Get the price ID for this plan
        const priceId = getPriceIdFromPlanType(planType);
        if (!priceId) {
            return new NextResponse('Invalid plan type', { status: 400 });
        }

        // Check for existing active subscription in Stripe
        const existingSubscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        const trialingSubscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'trialing',
            limit: 1
        });

        // Cancel existing subscriptions if any (for plan changes)
        for (const sub of [...existingSubscriptions.data, ...trialingSubscriptions.data]) {
            console.log('[PIX API] Cancelling existing subscription:', sub.id);
            try {
                await stripe.subscriptions.cancel(sub.id);
            } catch (cancelError: any) {
                console.log('[PIX API] Subscription already cancelled or error:', cancelError.message);
                // Continue - subscription might already be cancelled
            }
        }

        // Check if user already used trial for this specific plan
        const { data: usedTrial } = await supabaseAdmin
            .from('used_trials')
            .select('id')
            .eq('user_id', user.id)
            .eq('plan_type', planType)
            .maybeSingle();

        const hasUsedTrialForPlan = !!usedTrial;
        const trialDays = hasUsedTrialForPlan ? 0 : 7;

        console.log('[PIX API] Trial check:', { planType, hasUsedTrialForPlan, trialDays });

        // Create subscription in Stripe with send_invoice collection method
        // This creates a subscription that doesn't automatically charge
        const subscriptionParams: any = {
            customer: customer.id,
            items: [{ price: priceId }],
            collection_method: 'send_invoice',
            days_until_due: 7, // Invoice due in 7 days
            metadata: {
                userId: user.id,
                planType: planType,
                paymentMethod: 'pix'
            }
        };

        // Add trial period if user hasn't used trial for this plan
        if (trialDays > 0) {
            subscriptionParams.trial_period_days = trialDays;
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        console.log('[PIX API] Created Stripe subscription:', subscription.id, 'Status:', subscription.status);

        // Record trial usage if applicable
        if (trialDays > 0) {
            console.log('[PIX API] Recording used trial for plan:', planType);
            const { error: trialError } = await supabaseAdmin
                .from('used_trials')
                .upsert({
                    user_id: user.id,
                    plan_type: planType,
                    stripe_subscription_id: subscription.id,
                    used_at: new Date().toISOString()
                }, { onConflict: 'user_id,plan_type' });

            if (trialError) {
                console.error('[PIX API] Error recording used trial:', trialError);
            }
        }

        // The webhook (customer.subscription.created) will sync the subscription to Supabase
        // But we can also do an immediate sync for faster UX
        const priceAmount = PLAN_PRICES[planType as PlanPriceKey];

        // Safely convert Stripe timestamps to ISO strings
        const now = new Date();
        const trialEndsAt = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null;
        const periodStart = (subscription as any).current_period_start
            ? new Date((subscription as any).current_period_start * 1000).toISOString()
            : now.toISOString();
        const periodEnd = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000).toISOString()
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // For Pix payments, create with pending_pix status
        // Features will be locked until you manually activate in Stripe
        // When Stripe subscription becomes 'active', webhook will update Supabase
        const initialStatus = subscription.status === 'trialing' ? 'trial' : 'pending_pix';

        // Sync to Supabase immediately (webhook will also sync, but this is faster for UX)
        const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                stripe_customer_id: customer.id,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                plan_type: planType,
                status: initialStatus,
                payment_method: 'pix',
                trial_ends_at: trialEndsAt,
                current_period_start: periodStart,
                current_period_end: periodEnd,
                stripe_current_period_end: periodEnd,
                billing_period: 'monthly'
            } as any, { onConflict: 'user_id' });

        if (upsertError) {
            console.error('[PIX API] Error syncing to Supabase:', upsertError);
            // Don't fail - the webhook will handle sync
        } else {
            console.log('[PIX API] Synced subscription to Supabase');
        }

        // Send Telegram notification to admin
        const telegramMessage = formatPixTelegramMessage({
            planType,
            amount: priceAmount,
            userEmail: user.email,
            subscriptionId: subscription.id
        });
        sendTelegramNotification(telegramMessage); // Fire and forget

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            status: subscription.status,
            hasTrial: trialDays > 0,
            trialDays,
            amount: priceAmount,
            message: trialDays > 0
                ? `Período de teste de ${trialDays} dias ativado! Sua assinatura do plano ${planType} foi criada.`
                : `Assinatura do plano ${planType} criada com sucesso! Você receberá uma fatura por email.`
        });

    } catch (error: any) {
        console.error('[PIX API] Error:', error);
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
}
