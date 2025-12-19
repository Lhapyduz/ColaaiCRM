import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get customer ID from database
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        if (!subscription?.stripe_customer_id) {
            return new NextResponse('No subscription found', { status: 404 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
