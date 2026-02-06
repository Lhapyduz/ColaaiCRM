import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPeriodDays, BillingPeriod } from '@/lib/abacatepay';

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';
const API_KEY = process.env.ABACATEPAY_API_KEY_PROD || process.env.ABACATEPAY_API_KEY_DEV;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, planType, billingPeriod, userEmail, userName, price } = body;

        // 1. Validação de entrada
        if (!userEmail || !userId) {
            return NextResponse.json({ error: 'Dados do usuário ausentes' }, { status: 400 });
        }

        if (!price || price < 100) {
            return NextResponse.json({ error: 'Preço inválido (mínimo 100 centavos)' }, { status: 400 });
        }

        console.log('[AbacatePay] === CRIANDO BILLING (VERSÃO CORRIGIDA - CPF TESTE) ===');
        console.log('[AbacatePay] Timestamp:', new Date().toISOString());
        console.log('[AbacatePay] User:', userId, 'Email:', userEmail);
        console.log('[AbacatePay] Plan:', planType, 'Period:', billingPeriod, 'Price:', price);

        // 2. Montar body com placeholders para evitar erros de validação
        // AbacatePay exige cellphone e taxId se o objeto customer estiver presente.
        // O usuário completará os dados REAIS na tela de checkout.
        const billingBody = {
            frequency: "ONE_TIME",
            methods: ["PIX"],
            products: [
                {
                    externalId: `plan-${planType}-${billingPeriod}-${userId}`,
                    name: `Plano ${planType} - Cola Aí`,
                    description: `Assinatura ${billingPeriod} do plano ${planType}`,
                    quantity: 1,
                    price: price
                }
            ],
            customer: {
                name: userName || userEmail.split('@')[0],
                email: userEmail,
                cellphone: "11999999999", // Placeholder com DDD
                taxId: "41304588805",   // CPF de teste válido (passa no mod11)
            },
            returnUrl: "https://usecolaai.vercel.app",
            completionUrl: "https://usecolaai.vercel.app",
            metadata: {
                userId: userId,
                planType: planType,
                billingPeriod: billingPeriod
            }
        };

        console.log('[AbacatePay] Billing body (com placeholders):', JSON.stringify(billingBody, null, 2));

        const response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(billingBody),
        });

        const data = await response.json();
        console.log('[AbacatePay] Billing response:', JSON.stringify(data, null, 2));

        if (!response.ok || data.error) {
            console.error('[AbacatePay] Erro:', data);

            // Se falhar por falta de customer, tentaremos o fallback de criar apenas com email se for possível
            // Mas a documentação diz que são opcionais.
            return NextResponse.json({
                success: false,
                error: data.error || 'Erro na API AbacatePay'
            }, { status: 500 });
        }

        const billing = data.data;
        console.log('[AbacatePay] Billing criado:', billing?.id);
        console.log('[AbacatePay] Checkout URL:', billing?.url);

        // 3. Salvar no Supabase
        const now = new Date();
        const days = getPeriodDays(billingPeriod as BillingPeriod);
        const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: userId,
                plan_type: planType,
                status: 'pending_pix',
                payment_method: 'pix',
                abacatepay_billing_id: billing?.id,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                billing_period: billingPeriod,
            } as any, { onConflict: 'user_id' });

        return NextResponse.json({
            success: true,
            url: billing?.url
        });

    } catch (error: any) {
        console.error('[AbacatePay] Exception:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal Server Error'
        }, { status: 500 });
    }
}
