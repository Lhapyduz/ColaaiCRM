import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

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

                if (!userId) {
                    console.error('Missing userId in session metadata');
                    break;
                }

                const subscriptionId = session.subscription as string;

                // Fetch subscription details to get current period end
                const sub = await stripe.subscriptions.retrieve(subscriptionId);

                await supabaseAdmin
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: subscriptionId,
                        stripe_price_id: (sub as any).items.data[0].price.id,
                        plan_type: planType,
                        status: 'active',
                        current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
                        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                        stripe_current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                        billing_period: 'monthly'
                    } as any);

                break;
            }

            case 'customer.subscription.updated': {
                // Handle subscription update
                const sub = event.data.object as Stripe.Subscription;

                const stripeCustomerId = sub.customer as string;

                // Start by finding the user associated with this customer
                const { data: userData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (userData) {
                    await supabaseAdmin
                        .from('subscriptions')
                        .update({
                            status: sub.status,
                            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                            stripe_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
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
                            status: 'cancelled',
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
