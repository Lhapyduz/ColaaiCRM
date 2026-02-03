'use server';

import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

interface UpdatePlanParams {
    userId: string;
    planId: string; // The internal UUID from subscription_plans table
    periodEnd?: string;
}

export async function updateClientPlan({ userId, planId, periodEnd }: UpdatePlanParams) {
    try {
        console.log(`[ManagePlan] Updating plan for user ${userId} to plan ${planId}`);

        // 1. Fetch the Target Plan Details
        const { data: targetPlan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !targetPlan) {
            throw new Error(`Plan not found: ${planError?.message}`);
        }

        // 2. Fetch User's Current Subscription (to check if it's Stripe or Manual)
        const { data: currentSub, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError) {
            throw new Error(`Error fetching subscription: ${subError.message}`);
        }

        let stripeSubscriptionId = currentSub?.stripe_subscription_id;
        let paymentMethod = currentSub?.payment_method || 'manual';

        // 3. Logic: If Stripe, update Stripe. If Manual, just update DB.
        if (stripeSubscriptionId && targetPlan.stripe_price_id) {
            try {
                console.log(`[ManagePlan] Updating Stripe Subscription ${stripeSubscriptionId}...`);

                // Get current subscription items to know what to delete/update
                const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                const itemId = stripeSub.items.data[0].id;

                // Update Subscription in Stripe
                await stripe.subscriptions.update(stripeSubscriptionId, {
                    items: [{
                        id: itemId,
                        price: targetPlan.stripe_price_id,
                    }],
                    metadata: {
                        plan_type: targetPlan.name // Sync metadata
                    }
                });

                paymentMethod = 'card'; // Assumed if on Stripe
            } catch (stripeError: any) {
                console.error('[ManagePlan] Stripe Error:', stripeError);
                throw new Error(`Stripe Update Failed: ${stripeError.message}`);
            }
        }

        // 4. Update Supabase 'subscriptions' table (The App's Source of Truth)
        // Map Plan Name to Enum
        const mapPlanType = (name: string): 'Basico' | 'Avançado' | 'Profissional' => {
            const n = name.toLowerCase();
            if (n.includes('basico') || n.includes('básico')) return 'Basico';
            if (n.includes('avancado') || n.includes('avançado')) return 'Avançado';
            if (n.includes('profissional')) return 'Profissional';
            return 'Basico';
        };

        const planType = mapPlanType(targetPlan.name);

        // Calculate dates
        const now = new Date();
        const endDate = periodEnd ? new Date(periodEnd) : new Date(now.setMonth(now.getMonth() + 1));

        const subData = {
            user_id: userId,
            plan_type: planType,
            status: 'active',
            billing_period: targetPlan.billing_interval || 'monthly',
            current_period_start: new Date().toISOString(), // Reset period on change
            current_period_end: endDate.toISOString(),
            updated_at: new Date().toISOString(),
            payment_method: paymentMethod,
            // Only update stripe fields if we actually have them from the target plan
            ...(targetPlan.stripe_price_id ? { stripe_price_id: targetPlan.stripe_price_id } : {})
        };

        const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;

        // 5. Update 'subscriptions_cache' (The Admin Dashboard View)
        const cacheData = {
            tenant_id: userId,
            plan_name: targetPlan.name,
            status: 'active',
            amount_cents: targetPlan.price_cents,
            // mrr_cents is not a column, logic is calculated on frontend/view
            current_period_end: endDate.toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: cacheError } = await supabaseAdmin
            .from('subscriptions_cache')
            .upsert(cacheData, { onConflict: 'tenant_id' });

        if (cacheError) throw cacheError;

        revalidatePath('/admin/clients');
        return { success: true };

    } catch (error: any) {
        console.error('[ManagePlan] Critical Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateClientFeatureFlags(userId: string, flags: Record<string, boolean>) {
    try {
        const upserts = Object.entries(flags).map(([feature_key, enabled]) => ({
            tenant_id: userId,
            feature_key,
            enabled,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabaseAdmin
            .from('tenant_feature_flags')
            .upsert(upserts, { onConflict: 'tenant_id,feature_key' });

        if (error) throw error;

        revalidatePath('/admin/clients');
        return { success: true };
    } catch (error: any) {
        console.error('[ManageFeatures] Error:', error);
        return { success: false, error: error.message };
    }
}
