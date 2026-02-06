import { NextRequest, NextResponse } from 'next/server';
import { getAbacatepayBilling } from '@/lib/abacatepay';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Get billing period from subscription or default
async function getPeriodDaysForBilling(billingId: string): Promise<number> {
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('billing_period')
        .eq('abacatepay_billing_id', billingId)
        .maybeSingle();

    return subscription?.billing_period === 'annual' ? 365 : 30;
}

// Ativa a assinatura automaticamente quando o pagamento for confirmado
async function activateSubscriptionIfPaid(billingId: string): Promise<boolean> {
    try {
        // Buscar a subscription pelo billingId
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, plan_type, status, billing_period')
            .eq('abacatepay_billing_id', billingId)
            .maybeSingle();

        if (!subscription || subscription.status === 'active') {
            return false; // Já ativa ou não encontrada
        }

        // Calcular período correto baseado no billing_period
        const now = new Date();
        const days = subscription.billing_period === 'annual' ? 365 : 30;
        const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
            } as any)
            .eq('user_id', subscription.user_id);

        if (error) {
            console.error('[AbacatePay Check Status] Error activating subscription:', error);
            return false;
        }

        console.log('[AbacatePay Check Status] Subscription activated for user:', subscription.user_id, 'Period:', subscription.billing_period);
        return true;
    } catch (err) {
        console.error('[AbacatePay Check Status] Exception:', err);
        return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        const billingId = req.nextUrl.searchParams.get('billingId');

        if (!billingId) {
            return NextResponse.json(
                { error: 'billingId is required' },
                { status: 400 }
            );
        }

        const billing = await getAbacatepayBilling(billingId);

        if (!billing) {
            return NextResponse.json(
                { error: 'Billing not found' },
                { status: 404 }
            );
        }

        // Se o status for PAID, ativar a assinatura automaticamente
        let activated = false;
        if (billing.status === 'PAID') {
            activated = await activateSubscriptionIfPaid(billingId);
        }

        return NextResponse.json({
            billingId: billing.id,
            status: billing.status,
            amount: billing.amount,
            activated, // Informa se a assinatura foi ativada nesta verificação
        });

    } catch (error: any) {
        console.error('[AbacatePay Check Status] Error:', error);
        return NextResponse.json(
            { error: `Erro: ${error.message}` },
            { status: 500 }
        );
    }
}
