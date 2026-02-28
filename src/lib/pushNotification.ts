import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ligeirinho.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

// Supabase admin client for server-side operations
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
}

/**
 * Envia notificação push para todos os dispositivos de um usuário
 */
export async function sendPushToUser(
    userId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
    const supabase = getSupabaseAdmin();

    // Buscar todas as subscriptions do usuário
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
        console.log(`[Push] Nenhuma subscription encontrada para user ${userId}`);
        return { sent: 0, failed: 0, cleaned: 0 };
    }

    const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        url: payload.url || '/pedidos',
        tag: payload.tag || 'default',
    });

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    // Enviar para cada dispositivo
    for (const sub of subscriptions) {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
            },
        };

        try {
            await webpush.sendNotification(pushSubscription, notificationPayload);
            sent++;
            console.log(`[Push] Enviado com sucesso para endpoint: ${sub.endpoint.slice(-20)}`);
        } catch (err: unknown) {
            const error = err as { statusCode?: number };
            failed++;
            console.error(`[Push] Erro ao enviar para endpoint: ${sub.endpoint.slice(-20)}`, error);

            // Se a subscription expirou (410 Gone) ou é inválida (404), remover
            if (error.statusCode === 410 || error.statusCode === 404) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('id', sub.id);
                cleaned++;
                console.log(`[Push] Subscription expirada removida: ${sub.id}`);
            }
        }
    }

    console.log(`[Push] Resultado: ${sent} enviadas, ${failed} falharam, ${cleaned} limpas`);
    return { sent, failed, cleaned };
}

/**
 * Notifica o dono da loja quando um novo pedido é criado
 */
export async function notifyNewOrder(
    userId: string,
    orderNumber: number,
    customerName: string,
    total: number
) {
    const formattedTotal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(total);

    return sendPushToUser(userId, {
        title: '🔔 Novo Pedido!',
        body: `Pedido #${orderNumber} de ${customerName} — ${formattedTotal}`,
        url: '/pedidos',
        tag: `order-new-${orderNumber}`,
    });
}

/**
 * Notifica sobre mudança de status de um pedido
 */
export async function notifyOrderStatusChange(
    userId: string,
    orderNumber: number,
    newStatus: string
) {
    const statusLabels: Record<string, { label: string; emoji: string }> = {
        pending: { label: 'Pendente', emoji: '📋' },
        preparing: { label: 'Em Preparo', emoji: '👨‍🍳' },
        ready: { label: 'Pronto', emoji: '✅' },
        delivering: { label: 'Saiu para Entrega', emoji: '🚚' },
        delivered: { label: 'Entregue', emoji: '🎉' },
        cancelled: { label: 'Cancelado', emoji: '❌' },
    };

    const status = statusLabels[newStatus] || { label: newStatus, emoji: '📦' };

    return sendPushToUser(userId, {
        title: `${status.emoji} Pedido #${orderNumber}`,
        body: `Status atualizado: ${status.label}`,
        url: '/pedidos',
        tag: `order-status-${orderNumber}`,
    });
}
