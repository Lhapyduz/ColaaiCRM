import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe, getStripeCustomer } from '@/lib/stripe';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const { priceId, planType } = await req.json();

        // createClient is now async
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        console.log('[API Checkout] User Auth Check:', {
            found: !!user,
            id: user?.id,
            email: user?.email
        });

        if (!user || !user.email) {
            console.log('[API Checkout] Unauthorized: No user or email');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const customer = await getStripeCustomer(user.id, user.email, user.user_metadata?.full_name);

        if (!customer) {
            return new NextResponse('Customer creation failed', { status: 500 });
        }

        // Check for existing subscription
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle();

        const hasActiveSubscription = !!existingSub;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const sessionConfig: any = {
            customer: customer.id,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${appUrl}/assinatura?success=true`,
            cancel_url: `${appUrl}/assinatura?canceled=true`,
            metadata: {
                userId: user.id,
                planType: planType,
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    planType: planType
                }
            }
        };

        // Only add trial if user DOES NOT have an active subscription
        if (!hasActiveSubscription) {
            sessionConfig.subscription_data.trial_period_days = 3;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return new NextResponse(`Internal Error: ${(error as Error).message}`, { status: 500 });
    }
}
