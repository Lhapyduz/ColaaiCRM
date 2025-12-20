import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get local subscription to find stripe_customer_id
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!subscription || !subscription.stripe_customer_id) {
            return new NextResponse('No Stripe Customer ID found', { status: 404 });
        }

        // List subscriptions from Stripe for this customer
        const stripeSubscriptions = await stripe.subscriptions.list({
            customer: subscription.stripe_customer_id,
            status: 'all',
            limit: 1,
        });

        if (stripeSubscriptions.data.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found in Stripe' });
        }

        const stripeSub = stripeSubscriptions.data[0];

        // Map Stripe status to local status
        // status: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing
        let status = stripeSub.status;

        // Map Price ID to Plan Type
        const priceId = (stripeSub as any).items.data[0].price.id;
        let planType = 'professional'; // Default fallback

        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) {
            planType = 'basic';
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL) {
            planType = 'professional';
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) {
            planType = 'enterprise';
        }

        // Update local database
        const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
                status: status,
                plan_type: planType,
                stripe_subscription_id: stripeSub.id,
                stripe_price_id: priceId,
                current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
                current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
                stripe_current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
            } as any)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error syncing subscription:', error);
            return new NextResponse('Failed to update subscription', { status: 500 });
        }

        return NextResponse.json({
            message: 'Subscription synced successfully',
            status: status,
            current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString()
        });

    } catch (error) {
        console.error('Sync error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
