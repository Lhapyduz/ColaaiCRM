import { NextRequest, NextResponse } from 'next/server';
import { getAbacatepayBilling } from '@/lib/abacatepay';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStripeCustomer } from '@/lib/stripe';

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
// Também cria/reutiliza cliente no Stripe para unificar gestão de clientes
async function activateSubscriptionIfPaid(billingId: string): Promise<boolean> {
    try {
        // Buscar a subscription pelo billingId com dados do usuário
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, plan_type, status, billing_period, stripe_customer_id')
            .eq('abacatepay_billing_id', billingId)
            .maybeSingle();

        if (!subscription || subscription.status === 'active') {
            return false; // Já ativa ou não encontrada
        }

        // Buscar dados do usuário para criar/reutilizar cliente no Stripe
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(subscription.user_id);
        const user = userData?.user;

        let stripeCustomerId = subscription.stripe_customer_id;

        // Criar/reutilizar cliente no Stripe se ainda não tiver
        if (!stripeCustomerId && user?.email) {
            try {
                console.log('[AbacatePay Check Status] Criando/reutilizando cliente Stripe para:', user.email);
                const stripeCustomer = await getStripeCustomer(
                    subscription.user_id,
                    user.email,
                    user.user_metadata?.full_name
                );
                stripeCustomerId = stripeCustomer.id;
                console.log('[AbacatePay Check Status] Stripe customer ID:', stripeCustomerId);
            } catch (stripeError: any) {
                console.error('[AbacatePay Check Status] Erro ao criar cliente Stripe:', stripeError.message);
                // Continua mesmo se falhar - a assinatura PIX funciona sem Stripe
            }
        }

        // Calcular período correto baseado no billing_period
        const now = new Date();
        const days = subscription.billing_period === 'annual' ? 365 : 30;
        const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        // Montar dados de update incluindo stripe_customer_id se disponível
        const updateData: any = {
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
        };

        if (stripeCustomerId) {
            updateData.stripe_customer_id = stripeCustomerId;
        }

        const { error } = await supabaseAdmin
            .from('subscriptions')
            .update(updateData)
            .eq('user_id', subscription.user_id);

        if (error) {
            console.error('[AbacatePay Check Status] Error activating subscription:', error);
            return false;
        }

        console.log('[AbacatePay Check Status] Subscription activated for user:', subscription.user_id, 'Period:', subscription.billing_period, 'Stripe Customer:', stripeCustomerId || 'N/A');
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
