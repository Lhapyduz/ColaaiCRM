// WhatsApp notification utilities
export interface OrderDetails {
    order_number: number;
    customer_name: string;
    customer_phone: string;
    total: number;
    status: string;
    is_delivery: boolean;
    customer_address?: string;
    rating_token?: string;
}

export interface NotificationSettings {
    whatsapp_number: string;
    app_name: string;
}

// Status messages in Portuguese
const statusMessages: Record<string, { title: string; message: string; emoji: string }> = {
    pending: {
        title: 'Pedido Recebido',
        message: 'Seu pedido foi recebido e está aguardando confirmação.',
        emoji: '📋'
    },
    preparing: {
        title: 'Em Preparo',
        message: 'Seu pedido está sendo preparado com carinho! 🍳',
        emoji: '👨‍🍳'
    },
    ready: {
        title: 'Pedido Pronto',
        message: 'Seu pedido está pronto!',
        emoji: '✅'
    },
    delivering: {
        title: 'Saiu para Entrega',
        message: 'Seu pedido saiu para entrega! Em breve estará aí. 🛵',
        emoji: '🚚'
    },
    delivered: {
        title: 'Pedido Entregue',
        message: 'Seu pedido foi entregue! Obrigado pela preferência! ❤️',
        emoji: '🎉'
    },
    cancelled: {
        title: 'Pedido Cancelado',
        message: 'Infelizmente seu pedido foi cancelado. Entre em contato para mais informações.',
        emoji: '❌'
    }
};

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function generateWhatsAppMessage(
    order: OrderDetails,
    settings: NotificationSettings,
    newStatus: string,
    baseUrl?: string
): string {
    const statusInfo = statusMessages[newStatus] || statusMessages.pending;

    let message = `${statusInfo.emoji} *${settings.app_name}*\n\n`;
    message += `*${statusInfo.title}*\n`;
    message += `${'─'.repeat(20)}\n\n`;
    message += `📋 *Pedido #${order.order_number}*\n`;
    message += `👤 ${order.customer_name}\n`;
    message += `💰 Total: ${formatCurrency(order.total)}\n\n`;
    message += `${statusInfo.message}\n`;

    if (newStatus === 'ready' && !order.is_delivery) {
        message += `\n🏪 *Retire seu pedido no balcão!*`;
    }

    if (newStatus === 'delivering' && order.customer_address) {
        message += `\n📍 Entrega em: ${order.customer_address}`;
    }

    // Add rating link for delivered orders
    if (newStatus === 'delivered' && order.rating_token && baseUrl) {
        message += `\n\n⭐ *Avalie seu pedido:*\n${baseUrl}/avaliar/${order.rating_token}`;
    }

    return message;
}

export function getWhatsAppUrl(phone: string, message: string): string {
    // Clean phone number - remove non-digits
    let cleanPhone = phone.replace(/\D/g, '');

    // Add Brazil country code if not present
    if (cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone;
    } else if (cleanPhone.length === 10) {
        // Old format without 9 prefix
        cleanPhone = '55' + cleanPhone;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppNotification(
    order: OrderDetails,
    settings: NotificationSettings,
    newStatus: string,
    baseUrl?: string
): void {
    if (!order.customer_phone) {
        console.warn('No customer phone number available');
        return;
    }

    const message = generateWhatsAppMessage(order, settings, newStatus, baseUrl);
    const url = getWhatsAppUrl(order.customer_phone, message);

    window.open(url, '_blank');
}

// Check if we should send notification for this status change
export function shouldNotifyOnStatusChange(oldStatus: string, newStatus: string): boolean {
    // Always notify on these status changes
    const notifyStatuses = ['preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
    return notifyStatuses.includes(newStatus);
}
