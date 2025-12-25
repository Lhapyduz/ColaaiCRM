// @ts-nocheck - This is a Deno Edge Function, IDE errors are expected
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

console.log("Stripe Webhook Function Started");

serve(async (req: Request) => {
    try {
        const signature = req.headers.get("Stripe-Signature");

        if (!signature) {
            return new Response("Missing Stripe-Signature", { status: 400 });
        }

        const body = await req.text();
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
        const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
            console.error("Missing environment variables");
            return new Response("Server Configuration Error", { status: 500 });
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16", // Use a stable version compatible with the types
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                stripeWebhookSecret
            );
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Webhook signature verification failed: ${errMessage}`);
            return new Response(`Webhook Error: ${errMessage}`, { status: 400 });
        }

        const session = event.data.object as any; // Using any to avoid strict type issues in Deno for now
        const subscription = event.data.object as any;

        switch (event.type) {
            case "checkout.session.completed": {
                const userId = session.metadata?.userId;
                const planType = session.metadata?.planType;

                if (!userId) {
                    console.error("Missing userId in session metadata");
                    break;
                }

                const subscriptionId = session.subscription as string;

                // Handle old subscription cancellation
                const { data: existingSubs } = await supabaseAdmin
                    .from("subscriptions")
                    .select("stripe_subscription_id")
                    .eq("user_id", userId)
                    .neq("stripe_subscription_id", subscriptionId)
                    .in("status", ["active", "trialing"]);

                if (existingSubs && existingSubs.length > 0) {
                    for (const oldSub of existingSubs) {
                        try {
                            await stripe.subscriptions.cancel(oldSub.stripe_subscription_id);
                            console.log(
                                `Cancelled old subscription: ${oldSub.stripe_subscription_id}`
                            );
                        } catch (err) {
                            console.error(
                                `Failed to cancel old subscription ${oldSub.stripe_subscription_id}:`,
                                err
                            );
                        }
                    }
                }

                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = sub.items.data[0].price.id;

                // Derive planType
                let finalPlanType = planType;
                // Note: We don't have access to process.env.NEXT_PUBLIC_* here directly unless we pass them or hardcode.
                // For now, relying on metadata or default.
                // If specific price IDs are needed, they should be env vars or hardcoded if stable.
                // Assuming 'Basico' fallback if unknown.

                await supabaseAdmin.from("subscriptions").upsert({
                    user_id: userId,
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscriptionId,
                    stripe_price_id: priceId,
                    plan_type: finalPlanType || "Basico",
                    status: sub.status,
                    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                    stripe_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                    billing_period: "monthly",
                });

                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object as any;
                const stripeCustomerId = sub.customer as string;
                const priceId = sub.items.data[0].price.id;

                const { data: userData } = await supabaseAdmin
                    .from("subscriptions")
                    .select("user_id")
                    .eq("stripe_customer_id", stripeCustomerId)
                    .single();

                if (userData) {
                    // Derive plan type from price ID
                    const stripePriceBasic = Deno.env.get("STRIPE_PRICE_BASIC") || Deno.env.get("NEXT_PUBLIC_STRIPE_PRICE_BASIC");
                    const stripePriceProfessional = Deno.env.get("STRIPE_PRICE_PROFESSIONAL") || Deno.env.get("NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL");
                    const stripePriceEnterprise = Deno.env.get("STRIPE_PRICE_ENTERPRISE") || Deno.env.get("NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE");

                    let planType = "Basico"; // Default
                    if (priceId === stripePriceBasic) planType = "Basico";
                    else if (priceId === stripePriceProfessional) planType = "Avançado";
                    else if (priceId === stripePriceEnterprise) planType = "Profissional";

                    const updateData = {
                        status: sub.status,
                        plan_type: planType,
                        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        stripe_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        stripe_price_id: priceId,
                    };

                    await supabaseAdmin
                        .from("subscriptions")
                        .update(updateData)
                        .eq("user_id", userData.user_id);

                    console.log(`Updated subscription for user ${userData.user_id} to plan ${planType}`);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object as any;
                const stripeCustomerId = sub.customer as string;

                const { data: userData } = await supabaseAdmin
                    .from("subscriptions")
                    .select("user_id")
                    .eq("stripe_customer_id", stripeCustomerId)
                    .single();

                if (userData) {
                    await supabaseAdmin
                        .from("subscriptions")
                        .update({ status: "cancelled" })
                        .eq("user_id", userData.user_id);
                }
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(err);
        return new Response(JSON.stringify({ error: errMessage }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        });
    }
});
