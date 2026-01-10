import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe, getStripeCustomer } from '@/lib/stripe';
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

        // Ensure we have a Stripe customer
        const customer = await getStripeCustomer(
            user.id,
            user.email || '',
            user.user_metadata?.full_name
        );

        if (!customer) {
            return new NextResponse('Could not create Stripe customer', { status: 500 });
        }

        // Search for existing subscription to check if we need to update stripe_customer_id
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        // If no subscription or no stripe_id, we might need to update/insert
        // But for Portal, we strictly need a Customer ID.
        // We should try to update the local DB with this customer ID if it's missing
        if (subscription && !subscription.stripe_customer_id) {
            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({ stripe_customer_id: customer.id } as any)
                .eq('user_id', user.id);

            if (updateError) {
                console.error('Error updating stripe_customer_id in portal route:', updateError);
            }
        }

        // Use VERCEL_URL for production deployments, fallback to NEXT_PUBLIC_APP_URL or localhost
        const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || vercelUrl || 'http://localhost:3000';

        const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: `${appUrl}/assinatura?portal=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        return new NextResponse('Internal Error: ' + (error as Error).message, { status: 500 });
    }
}
