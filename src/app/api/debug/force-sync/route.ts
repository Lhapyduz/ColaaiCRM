import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

// Endpoint para forçar atualização da assinatura do usuário atual
export async function POST() {
    try {
        // Usar diretamente o ID do cliente que vemos no Stripe Dashboard
        // A busca por email não está funcionando (pode ser cache ou account issue)
        const customerId = 'cus_TdhX0sMNPRrhLR';

        console.log('[Force Sync] Using customer ID directly:', customerId);

        // Buscar assinaturas desse cliente
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 10
        });

        console.log('[Force Sync] Found subscriptions:', subscriptions.data.map(s => ({
            id: s.id,
            status: s.status,
            plan: s.items.data[0]?.price.id
        })));

        // Encontrar a assinatura ativa ou em trial
        let activeSub = subscriptions.data.find(s => s.status === 'active' || s.status === 'trialing');

        if (!activeSub && subscriptions.data.length > 0) {
            activeSub = subscriptions.data[0];
        }

        if (!activeSub) {
            return NextResponse.json({
                error: 'No subscription found',
                customerId: customerId
            }, { status: 404 });
        }

        // Derivar o tipo de plano do price ID
        const priceId = activeSub.items.data[0].price.id;
        let planType = 'Basico';
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) planType = 'Basico';
        else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL) planType = 'Avançado';
        else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) planType = 'Profissional';

        // Mapear status
        let status = activeSub.status;
        if (status === 'trialing') status = 'trial';
        else if (status === 'canceled') status = 'cancelled';
        else if (status === 'past_due' || status === 'unpaid') status = 'expired';

        // O user_id do usuário teste@teste.com (obtido do debug anterior)
        const userId = '2c799746-cf08-450e-8087-bb54092b7dd1';

        // Preparar datas com validação
        const now = new Date().toISOString();
        const sub = activeSub as any;
        const trialEndsAt = activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null;
        const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : now;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : now;

        console.log('[Force Sync] Updating with dates:', { trialEndsAt, periodStart, periodEnd });

        // Atualizar no Supabase
        const { data, error } = await supabaseAdmin
            .from('subscriptions')
            .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: activeSub.id,
                stripe_price_id: priceId,
                plan_type: planType,
                status: status,
                trial_ends_at: trialEndsAt,
                current_period_start: periodStart,
                current_period_end: periodEnd,
                stripe_current_period_end: periodEnd
            } as any)
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error('[Force Sync] Update error:', error);
            return NextResponse.json({
                error: 'Update failed',
                details: error
            }, { status: 500 });
        }

        console.log('[Force Sync] Successfully updated subscription:', data);

        return NextResponse.json({
            success: true,
            message: 'Subscription force synced successfully!',
            customerId: customerId,
            subscriptionId: activeSub.id,
            planType: planType,
            status: status,
            updatedData: data
        });

    } catch (error) {
        console.error('[Force Sync] Error:', error);
        return NextResponse.json({
            error: 'Internal error',
            details: (error as Error).message
        }, { status: 500 });
    }
}
