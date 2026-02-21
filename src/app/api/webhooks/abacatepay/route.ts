import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

// Helper to verify webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret) {
        console.warn('[AbacatePay Webhook] No webhook secret configured, skipping verification');
        return true; // Allow in dev mode without secret
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

// Create fixed ADM employee if not exists
async function createFixedAdmEmployee(userId: string): Promise<void> {
    try {
        const { data: existingAdm } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('user_id', userId)
            .eq('is_fixed', true)
            .maybeSingle();

        if (!existingAdm) {
            console.log('[AbacatePay Webhook] Creating fixed ADM employee for user:', userId);
            const { error: admError } = await supabaseAdmin
                .from('employees')
                .insert({
                    user_id: userId,
                    name: 'ADM',
                    role: 'admin',
                    pin_code: '0001',
                    is_active: true,
                    is_fixed: true,
                    permissions: {
                        orders: true,
                        products: true,
                        categories: true,
                        customers: true,
                        reports: true,
                        settings: true,
                        employees: true,
                        finance: true
                    }
                });

            if (admError) {
                console.error('[AbacatePay Webhook] Error creating ADM:', admError);
            } else {
                console.log('[AbacatePay Webhook] ADM employee created successfully');
            }
        }
    } catch (err) {
        console.error('[AbacatePay Webhook] Exception creating ADM:', err);
    }
}

// Calculate period end based on billing period
function calculatePeriodEnd(billingPeriod?: string): Date {
    const now = new Date();
    const days = billingPeriod === 'annual' ? 365 : 30;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-abacatepay-signature') || '';
        const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET || '';

        // Verify signature (skip if no secret configured - dev mode)
        if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
            console.error('[AbacatePay Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event = JSON.parse(body);

        console.log(`[AbacatePay Webhook] Received event: ${event.event || event.type}`);

        // Handle billing.paid event
        const eventType = event.event || event.type;
        if (eventType === 'billing.paid' || eventType === 'BILLING_PAID') {
            const billing = event.data || event.billing || event;
            const metadata = billing.metadata || {};

            const userId = metadata.userId;
            const planType = metadata.planType;
            const billingPeriod = metadata.billingPeriod || 'monthly';
            const billingId = billing.id;

            console.log('[AbacatePay Webhook] Processing paid billing:', {
                billingId,
                userId,
                planType,
                billingPeriod,
            });

            if (!userId) {
                // Try to find user by billing ID
                const { data: existingSub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id, plan_type, billing_period')
                    .eq('abacatepay_billing_id', billingId)
                    .maybeSingle();

                if (existingSub) {
                    console.log('[AbacatePay Webhook] Found user by billing ID:', existingSub.user_id);

                    // Activate subscription
                    const now = new Date();
                    const periodEnd = calculatePeriodEnd(existingSub.billing_period);

                    const { error: updateError } = await supabaseAdmin
                        .from('subscriptions')
                        .update({
                            status: 'active',
                            current_period_start: now.toISOString(),
                            current_period_end: periodEnd.toISOString(),
                        })
                        .eq('user_id', existingSub.user_id);

                    if (updateError) {
                        console.error('[AbacatePay Webhook] Error updating subscription:', updateError);
                    } else {
                        console.log('[AbacatePay Webhook] Subscription activated successfully');
                        await createFixedAdmEmployee(existingSub.user_id);
                    }
                } else {
                    console.error('[AbacatePay Webhook] No user found for billing:', billingId);
                }
            } else {
                // Activate subscription with metadata
                const now = new Date();
                const periodEnd = calculatePeriodEnd(billingPeriod);

                const { error: upsertError } = await supabaseAdmin
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        plan_type: planType || 'Basico',
                        status: 'active',
                        payment_method: 'pix',
                        abacatepay_billing_id: billingId,
                        current_period_start: now.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        billing_period: billingPeriod,
                    }, { onConflict: 'user_id' });

                if (upsertError) {
                    console.error('[AbacatePay Webhook] Error upserting subscription:', upsertError);
                } else {
                    console.log('[AbacatePay Webhook] Subscription activated for user:', userId, 'Period:', billingPeriod);
                    await createFixedAdmEmployee(userId);
                }
            }
        }

        return NextResponse.json({ received: true });

    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Error';
        console.error('[AbacatePay Webhook] Error:', errorMsg);
        return NextResponse.json(
            { error: `Webhook error: ${errorMsg}` },
            { status: 500 }
        );
    }
}
