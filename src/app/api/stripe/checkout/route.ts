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

        if (!user || !user.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const customer = await getStripeCustomer(user.id, user.email, user.user_metadata?.full_name);

        if (!customer) {
            return new NextResponse('Customer creation failed', { status: 500 });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura?canceled=true`,
            metadata: {
                userId: user.id,
                planType: planType,
            },
            subscription_data: {
                trial_period_days: 7,
                metadata: {
                    userId: user.id,
                    planType: planType
                }
            }
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
