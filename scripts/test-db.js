const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const userId = 'e3c65606-f8a2-4322-b56f-5893be4b2a13';
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const plan = {
        name: 'Básico',
        billing_interval: 'monthly',
        price_cents: 1000
    };

    const mapPlanType = (name) => {
        const n = name.toLowerCase();
        if (n.includes('basico') || n.includes('básico')) return 'Basico';
        if (n.includes('avancado') || n.includes('avançado')) return 'Avançado';
        if (n.includes('profissional')) return 'Profissional';
        return 'Basico';
    };

    const subData = {
        user_id: userId,
        plan_type: mapPlanType(plan.name),
        status: 'active',
        billing_period: plan.billing_interval || 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
        updated_at: now.toISOString(),
        payment_method: 'manual',
    };

    console.log("Trying to upsert subscriptions:", subData);
    const { error: subError } = await supabase.from('subscriptions').upsert(subData, { onConflict: 'user_id' });
    if (subError) {
        console.log("SubError:", subError);
    }

    console.log("Trying to update/insert subscriptions_cache");
    const { data: existingCache } = await supabase
        .from('subscriptions_cache')
        .select('id')
        .eq('tenant_id', userId)
        .maybeSingle();

    if (existingCache) {
        console.log("existing cache found", existingCache);
        const { error: cacheError } = await supabase
            .from('subscriptions_cache')
            .update({
                plan_name: plan.name,
                status: 'active',
                amount_cents: plan.price_cents,
                current_period_end: endDate.toISOString(),
            })
            .eq('id', existingCache.id);
        if (cacheError) console.log("Cache update error:", cacheError);
    } else {
        console.log("no existing cache, inserting...");
        const { error: cacheError } = await supabase
            .from('subscriptions_cache')
            .insert({
                id: `manual_${userId}`,
                tenant_id: userId,
                user_id: userId,
                plan_name: plan.name,
                status: 'active',
                amount_cents: plan.price_cents,
                current_period_end: endDate.toISOString(),
            });
        if (cacheError) console.log("Cache insert error:", cacheError);
    }
}

main();
