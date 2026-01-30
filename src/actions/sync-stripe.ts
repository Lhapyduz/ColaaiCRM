'use server';

import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function syncStripeData() {
    console.log('[Sync] Starting full Stripe sync...');
    const results = {
        subscriptions: 0,
        errors: 0,
        matched_users: 0
    };

    try {
        let hasMore = true;
        let startingAfter: string | undefined = undefined;

        while (hasMore) {
            const paginatedSubscriptions = await stripe.subscriptions.list({
                limit: 100,
                status: 'all',
                expand: ['data.plan.product'],
                starting_after: startingAfter,
            });

            if (paginatedSubscriptions.data.length === 0) {
                break;
            }

            console.log(`[Sync] Processing ${paginatedSubscriptions.data.length} subscriptions...`);

            // Process each subscription
            for (const sub of paginatedSubscriptions.data) {
                try {
                    const userId = sub.metadata?.userId;
                    let validUserId = null;

                    // If we have a userId in metadata, verify it exists in our auth system using supabaseAdmin
                    if (userId) {
                        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
                        if (user && !error) {
                            validUserId = user.id;
                        }
                    }

                    // If no userId in metadata, try to find by customer email
                    if (!validUserId) {
                        const customer = await stripe.customers.retrieve(sub.customer as string);
                        if (!customer.deleted && customer.email) {
                            // Find user by email - this is tricky with supabaseAdmin, we actully need to query auth.users directly or listUsers
                            // But listUsers is paginated, so queries might be slow.
                            // For now, let's rely on metadata primarily, and if missing, simply log it.
                            // Or better: Use RPC or Service Role to query auth.users schema if accessible, but admin API is safer.
                            // Let's stick to metadata for now to avoid complexity of matching thousands of emails.
                        }
                    }

                    // Prepare record
                    const amount = sub.items.data[0]?.price?.unit_amount || sub.plan?.amount || 0;
                    const planName = (sub.plan?.product as any)?.name || 'Desconhecido';

                    const record = {
                        id: sub.id,
                        user_id: validUserId, // Can be null if not found
                        status: sub.status,
                        plan_name: planName,
                        amount_cents: amount,
                        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        tenant_id: validUserId, // Redundant but good for backward compat
                        created_at: new Date(sub.created * 1000).toISOString()
                    };

                    // Upsert into Supabase
                    const { error } = await supabaseAdmin
                        .from('subscriptions_cache')
                        .upsert(record);

                    if (error) {
                        console.error('[Sync] Error upserting sub:', sub.id, error);
                        results.errors++;
                    } else {
                        results.subscriptions++;
                        if (validUserId) results.matched_users++;
                    }

                } catch (err) {
                    console.error('[Sync] Error processing sub:', sub.id, err);
                    results.errors++;
                }
            }

            hasMore = paginatedSubscriptions.has_more;
            if (hasMore) {
                startingAfter = paginatedSubscriptions.data[paginatedSubscriptions.data.length - 1].id;
            }
        }

        console.log('[Sync] Completed:', results);
        return { success: true, ...results };

    } catch (error) {
        console.error('[Sync] Fatal error:', error);
        return { success: false, error: (error as Error).message };
    }
}
