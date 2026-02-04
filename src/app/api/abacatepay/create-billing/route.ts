import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
    createAbacatepayBilling,
    ABACATEPAY_PLAN_PRICES,
    AbacatepayPlanType
} from '@/lib/abacatepay';

export async function POST(req: NextRequest) {
    try {
        const { planType } = await req.json();

        // Validate input
        if (!planType || !ABACATEPAY_PLAN_PRICES[planType as AbacatepayPlanType]) {
            return NextResponse.json(
                { error: 'Tipo de plano inválido' },
                { status: 400 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        console.log('[AbacatePay] Creating billing for user:', user.id, 'Plan:', planType);

        const priceInCents = ABACATEPAY_PLAN_PRICES[planType as AbacatepayPlanType];
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Create billing in AbacatePay
        const { error, billing } = await createAbacatepayBilling({
            frequency: 'ONE_TIME',
            methods: ['PIX'],
            products: [
                {
                    externalId: `plan-${planType}-${user.id}`,
                    name: `Plano ${planType} - Cola Aí`,
                    description: `Assinatura mensal do plano ${planType}`,
                    quantity: 1,
                    price: priceInCents,
                }
            ],
            returnUrl: `${appUrl}/assinatura?success=true`,
            completionUrl: `${appUrl}/assinatura?pix_success=true`,
            customer: {
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email,
                cellphone: user.user_metadata?.phone || '11999999999', // Campo obrigatório pela API
                taxId: user.user_metadata?.cpf || '00000000000', // CPF padrão para dev - obrigatório pela API
            },
            metadata: {
                userId: user.id,
                planType: planType,
                userEmail: user.email,
            },
        });

        if (error || !billing) {
            console.error('[AbacatePay] Error creating billing:', error);
            return NextResponse.json(
                { error: error || 'Falha ao criar cobrança PIX' },
                { status: 500 }
            );
        }

        console.log('[AbacatePay] Billing created:', billing.id, 'Status:', billing.status);
        console.log('[AbacatePay] Full billing response:', JSON.stringify(billing, null, 2));

        // Save pending subscription in Supabase
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                plan_type: planType,
                status: 'pending_pix',
                payment_method: 'pix',
                abacatepay_billing_id: billing.id,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                billing_period: 'monthly',
            } as any, { onConflict: 'user_id' });

        if (upsertError) {
            console.error('[AbacatePay] Error saving to Supabase:', upsertError);
            // Don't fail - the webhook will handle it
        }

        // Extract PIX data - handle different response formats from AbacatePay
        // Using 'any' to handle varying response shapes from the API
        const billingAny = billing as any;
        const pixData = billingAny.pix || billingAny.pixQrCode || billingAny.qrCode || null;
        const qrCodePayload = pixData?.qrCode || pixData?.payload || billingAny.pixQrCode?.payload || billing.url || null;

        console.log('[AbacatePay] pixData:', pixData);
        console.log('[AbacatePay] qrCodePayload:', qrCodePayload);

        return NextResponse.json({
            success: true,
            billingId: billing.id,
            billingUrl: billing.url,
            status: billing.status,
            pix: pixData ? {
                qrCode: qrCodePayload,
                qrCodeBase64: pixData.qrCodeBase64 || pixData.encodedImage || pixData.base64 || null,
                expiresAt: pixData.expiresAt || null,
            } : null,
            // Fallback: if no PIX data, send the billing URL so we can generate QR from it
            fallbackQrCode: billing.url,
            amount: priceInCents / 100,
        });

    } catch (error: any) {
        console.error('[AbacatePay] Exception:', error);
        return NextResponse.json(
            { error: `Erro interno: ${error.message}` },
            { status: 500 }
        );
    }
}
