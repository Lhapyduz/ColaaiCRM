'use server';

import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// ═══════════════════════════════════════════════════════════════
// EXCLUIR CLIENTE — Remove TUDO: Auth + DB + Stripe
// ═══════════════════════════════════════════════════════════════
export async function deleteClient(userId: string) {
    const errors: string[] = [];

    try {
        // 1. Buscar dados do Stripe antes de excluir do DB
        const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id, stripe_subscription_id')
            .eq('user_id', userId)
            .maybeSingle();

        // 2. Cancelar Subscription no Stripe
        if (sub?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(sub.stripe_subscription_id);
                console.log(`[DeleteClient] Stripe subscription ${sub.stripe_subscription_id} cancelada`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error('[DeleteClient] Erro ao cancelar Stripe sub:', msg);
                errors.push(`Stripe sub: ${msg}`);
            }
        }

        // 3. Deletar Customer no Stripe
        if (sub?.stripe_customer_id) {
            try {
                await stripe.customers.del(sub.stripe_customer_id);
                console.log(`[DeleteClient] Stripe customer ${sub.stripe_customer_id} deletado`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error('[DeleteClient] Erro ao deletar Stripe customer:', msg);
                errors.push(`Stripe customer: ${msg}`);
            }
        }

        // 4. Remover de tenant_feature_flags
        try {
            await supabaseAdmin.from('tenant_feature_flags').delete().eq('tenant_id', userId);
        } catch (e: unknown) {
            errors.push(`feature_flags: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 5. Remover de subscriptions_cache
        try {
            await supabaseAdmin.from('subscriptions_cache').delete().eq('tenant_id', userId);
        } catch (e: unknown) {
            errors.push(`subscriptions_cache: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 6. Remover de subscriptions
        try {
            await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);
        } catch (e: unknown) {
            errors.push(`subscriptions: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 7. Remover de user_settings
        try {
            await supabaseAdmin.from('user_settings').delete().eq('user_id', userId);
        } catch (e: unknown) {
            errors.push(`user_settings: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 8. Remover do Supabase Auth
        try {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) throw authError;
            console.log(`[DeleteClient] Auth user ${userId} removido`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[DeleteClient] Erro ao deletar do Auth:', msg);
            errors.push(`auth: ${msg}`);
        }

        revalidatePath('/admin/clients');

        if (errors.length > 0) {
            return { success: true, partial: true, errors };
        }
        return { success: true };

    } catch (error: unknown) {
        console.error('[DeleteClient] Erro fatal:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// ═══════════════════════════════════════════════════════════════
// EDITAR CLIENTE — Atualiza email + nome da loja
// ═══════════════════════════════════════════════════════════════
interface EditClientParams {
    userId: string;
    email?: string;
    storeName?: string;
}

export async function editClient({ userId, email, storeName }: EditClientParams) {
    try {
        // 1. Atualizar email no Supabase Auth
        if (email) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email,
            });
            if (authError) throw new Error(`Auth: ${authError.message}`);
        }

        // 2. Atualizar nome da loja em user_settings
        if (storeName) {
            const { error: settingsError } = await supabaseAdmin
                .from('user_settings')
                .update({ app_name: storeName })
                .eq('user_id', userId);
            if (settingsError) throw new Error(`Settings: ${settingsError.message}`);
        }

        // 3. Atualizar email do customer no Stripe (se existir)
        if (email) {
            const { data: sub } = await supabaseAdmin
                .from('subscriptions')
                .select('stripe_customer_id')
                .eq('user_id', userId)
                .maybeSingle();

            if (sub?.stripe_customer_id) {
                try {
                    await stripe.customers.update(sub.stripe_customer_id, { email });
                } catch (e: unknown) {
                    console.warn('[EditClient] Stripe customer update falhou:', e instanceof Error ? e.message : String(e));
                }
            }
        }

        revalidatePath('/admin/clients');
        return { success: true };
    } catch (error: unknown) {
        console.error('[EditClient] Erro:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// ═══════════════════════════════════════════════════════════════
// CONCEDER ACESSO — Plano + duração flexível
// ═══════════════════════════════════════════════════════════════
interface GrantAccessParams {
    userId: string;
    planId: string;
    duration: {
        value: number;
        unit: 'days' | 'months' | 'years';
    };
}

export async function grantPlanAccess({ userId, planId, duration }: GrantAccessParams) {
    try {
        // 1. Buscar detalhes do plano
        const { data: plan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            throw new Error(`Plano não encontrado: ${planError?.message}`);
        }

        // 2. Calcular data de expiração a partir de AGORA
        const now = new Date();
        const endDate = new Date(now);

        switch (duration.unit) {
            case 'days':
                endDate.setDate(endDate.getDate() + duration.value);
                break;
            case 'months':
                endDate.setMonth(endDate.getMonth() + duration.value);
                break;
            case 'years':
                endDate.setFullYear(endDate.getFullYear() + duration.value);
                break;
        }

        // 3. Map plan type para os valores aceitos pela constraint do banco
        const mapPlanType = (name: string): 'Basico' | 'Avançado' | 'Profissional' => {
            const n = name.toLowerCase();
            if (n.includes('basico') || n.includes('básico')) return 'Basico';
            if (n.includes('avancado') || n.includes('avançado')) return 'Avançado';
            if (n.includes('profissional')) return 'Profissional';
            return 'Basico';
        };

        // 4. Map billing interval para valores aceitos pela constraint
        const mapBillingInterval = (interval?: string): 'monthly' | 'semiannual' | 'annual' => {
            if (interval === 'annual' || interval === 'yearly') return 'annual';
            if (interval === 'semiannual') return 'semiannual';
            return 'monthly';
        };

        // 5. Atualizar tabela subscriptions (UPSERT por user_id que é UNIQUE)
        const subData = {
            user_id: userId,
            plan_type: mapPlanType(plan.name),
            status: 'active',
            billing_period: mapBillingInterval(plan.billing_interval),
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            updated_at: now.toISOString(),
            payment_method: 'manual',
            ...(plan.stripe_price_id ? { stripe_price_id: plan.stripe_price_id } : {}),
        };

        const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id' });

        if (subError) throw new Error(`Subscriptions: ${subError.message}`);

        // 6. Atualizar subscriptions_cache — deletar registros antigos e inserir novo
        // Primeiro, deletar quaisquer registros existentes para este tenant
        await supabaseAdmin
            .from('subscriptions_cache')
            .delete()
            .eq('tenant_id', userId);

        // Depois inserir o registro limpo e atualizado
        const { error: cacheError } = await supabaseAdmin
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

        if (cacheError) {
            console.error('[GrantAccess] Cache insert error:', cacheError);
            // Não falhar a operação inteira — o subscription principal já foi atualizado
        }

        revalidatePath('/admin/clients');
        return { success: true, expiresAt: endDate.toISOString() };

    } catch (error: unknown) {
        console.error('[GrantAccess] Erro:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// ═══════════════════════════════════════════════════════════════
// REVOGAR ACESSO — Cancela imediatamente
// ═══════════════════════════════════════════════════════════════
export async function revokeAccess(userId: string) {
    try {
        const now = new Date().toISOString();

        // 1. Buscar Stripe subscription
        const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', userId)
            .maybeSingle();

        // 2. Cancelar no Stripe (imediatamente)
        if (sub?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            } catch (e: unknown) {
                console.warn('[RevokeAccess] Stripe cancel falhou:', e instanceof Error ? e.message : String(e));
            }
        }

        // 3. Atualizar subscriptions — status canceled e period_end = agora
        const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .update({
                status: 'canceled',
                current_period_end: now,
                updated_at: now,
            })
            .eq('user_id', userId);

        if (subError) {
            console.error('[RevokeAccess] Erro ao atualizar subscriptions:', subError);
        }

        // 4. Atualizar subscriptions_cache — status canceled, period_end = agora, limpar plan
        const { error: cacheError } = await supabaseAdmin
            .from('subscriptions_cache')
            .update({
                status: 'canceled',
                current_period_end: now,
            })
            .eq('tenant_id', userId);

        if (cacheError) {
            console.error('[RevokeAccess] Erro ao atualizar cache:', cacheError);
        }

        // 5. Se não houver cache, criar um com status canceled para que a listagem reflita
        const { data: cacheCheck } = await supabaseAdmin
            .from('subscriptions_cache')
            .select('id')
            .eq('tenant_id', userId)
            .limit(1);

        if (!cacheCheck || cacheCheck.length === 0) {
            await supabaseAdmin
                .from('subscriptions_cache')
                .insert({
                    id: `revoked_${userId}`,
                    tenant_id: userId,
                    user_id: userId,
                    plan_name: 'Cancelado',
                    status: 'canceled',
                    amount_cents: 0,
                    current_period_end: now,
                });
        }

        revalidatePath('/admin/clients');
        return { success: true };
    } catch (error: unknown) {
        console.error('[RevokeAccess] Erro:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
