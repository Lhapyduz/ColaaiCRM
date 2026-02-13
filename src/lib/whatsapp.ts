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

// Emoji constants using fromCodePoint for encoding safety
export const EMOJIS = {
    CLIPBOARD: String.fromCodePoint(0x1F4CB),
    COOK: String.fromCodePoint(0x1F468, 0x200D, 0x1F373),
    COOK_PAN: String.fromCodePoint(0x1F373),
    CHECK: String.fromCodePoint(0x2705),
    TRUCK: String.fromCodePoint(0x1F69A),
    SCOOTER: String.fromCodePoint(0x1F6F5),
    CELEBRATION: String.fromCodePoint(0x1F389),
    HEART: String.fromCodePoint(0x2764, 0xFE0F),
    CANCEL: String.fromCodePoint(0x274C),
    BURGER: String.fromCodePoint(0x1F354),
    FRIES: String.fromCodePoint(0x1F35F),
    USER: String.fromCodePoint(0x1F464),
    PHONE: String.fromCodePoint(0x1F4F1),
    LOCATION: String.fromCodePoint(0x1F4CD),
    HOUSE: String.fromCodePoint(0x1F3E0),
    NEIGHBORHOOD: String.fromCodePoint(0x1F3D8, 0xFE0F),
    STORE: String.fromCodePoint(0x1F3EA),
    PACKAGE: String.fromCodePoint(0x1F4E6),
    MEMO: String.fromCodePoint(0x1F4DD),
    MONEY_BAG: String.fromCodePoint(0x1F4B0),
    BANKNOTE: String.fromCodePoint(0x1F4B5),
    CARD: String.fromCodePoint(0x1F4B3),
    COUPON: String.fromCodePoint(0x1F3F7, 0xFE0F),
    ZAP: String.fromCodePoint(0x26A1),
    WAVE: String.fromCodePoint(0x1F44B),
    SPARKLES: String.fromCodePoint(0x2728),
    ROCKET: String.fromCodePoint(0x1F680),
    STAR: String.fromCodePoint(0x2B50),
    SPEECH: String.fromCodePoint(0x1F4AC),
    NUMBERS: String.fromCodePoint(0x1F522),
    MONEY_MOUTH: String.fromCodePoint(0x1F911),
    CLOCK: String.fromCodePoint(0x23F0),
    LINK: String.fromCodePoint(0x1F517),
    EMAIL: String.fromCodePoint(0x1F4E7),
};
// Status messages in Portuguese
const statusMessages: Record<string, { title: string; message: string; emoji: string }> = {
    pending: {
        title: 'Pedido Recebido',
        message: 'Seu pedido foi recebido e está aguardando confirmação.',
        emoji: EMOJIS.CLIPBOARD
    },
    preparing: {
        title: 'Em Preparo',
        message: `Seu pedido está sendo preparado com carinho! ${EMOJIS.COOK_PAN}`,
        emoji: EMOJIS.COOK
    },
    ready: {
        title: 'Pedido Pronto',
        message: 'Seu pedido está pronto!',
        emoji: EMOJIS.CHECK
    },
    delivering: {
        title: 'Saiu para Entrega',
        message: `Seu pedido saiu para entrega! Em breve estará aí. ${EMOJIS.SCOOTER}`,
        emoji: EMOJIS.TRUCK
    },
    delivered: {
        title: 'Pedido Entregue',
        message: `Seu pedido foi entregue! Obrigado pela preferência! ${EMOJIS.HEART}`,
        emoji: EMOJIS.CELEBRATION
    },
    cancelled: {
        title: 'Pedido Cancelado',
        message: 'Infelizmente seu pedido foi cancelado. Entre em contato para mais informações.',
        emoji: EMOJIS.CANCEL
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

    let message = `${statusInfo.emoji} *${settings.app_name.toUpperCase()}*\n\n`;
    message += `Olá, *${order.customer_name}*! ${EMOJIS.WAVE}\n`;
    message += `Status do seu pedido: *${statusInfo.title}*\n`;
    message += `--------------------\n\n`;
    message += `${EMOJIS.NUMBERS} *PEDIDO #${order.order_number}*\n`;
    message += `${EMOJIS.BANKNOTE} *Total:* ${formatCurrency(order.total)}\n\n`;

    message += `${statusInfo.message}\n\n`;

    if (newStatus === 'ready' && !order.is_delivery) {
        message += `${EMOJIS.STORE} *RETIRADA:* Já pode vir buscar seu pedido no balcão! Estamos te esperando. ${EMOJIS.SPARKLES}\n`;
    }

    if (newStatus === 'delivering' && order.customer_address) {
        message += `${EMOJIS.LOCATION} *ENDEREÇO:* ${order.customer_address}\n`;
    }

    // Add rating link for delivered orders
    if (newStatus === 'delivered' && order.rating_token && baseUrl) {
        message += `--------------------\n\n`;
        message += `${EMOJIS.STAR} *Gostou? Nos avalie!*\n`;
        message += `Sua opinião é muito importante para nós:\n`;
        message += `${baseUrl}/avaliar/${order.rating_token}\n`;
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

// ==============================================================
// PIX PAYMENT NOTIFICATIONS (CallMeBot API)
// ==============================================================

const ADMIN_PHONE = '+5541995618116'; // Admin WhatsApp number
const CALLMEBOT_API = 'https://api.callmebot.com/whatsapp.php';

interface WhatsAppNotificationResult {
    success: boolean;
    message: string;
}

/**
 * Send a WhatsApp notification to the admin using CallMeBot API
 * Requires CALLMEBOT_APIKEY environment variable to be set
 * 
 * SETUP:
 * 1. Add +34 623 78 95 80 to your contacts
 * 2. Send "I allow callmebot to send me messages" via WhatsApp
 * 3. You'll receive an API key - add it to CALLMEBOT_APIKEY environment variable
 */
export async function sendAdminWhatsAppNotification(
    message: string
): Promise<WhatsAppNotificationResult> {
    const apikey = process.env.CALLMEBOT_APIKEY;

    if (!apikey) {
        console.warn('[WhatsApp] CALLMEBOT_APIKEY not configured');
        return {
            success: false,
            message: 'API key not configured'
        };
    }

    try {
        // URL encode the message
        const encodedMessage = encodeURIComponent(message);
        const url = `${CALLMEBOT_API}?phone=${ADMIN_PHONE}&text=${encodedMessage}&apikey=${apikey}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (response.ok) {
            console.log('[WhatsApp] Admin notification sent successfully');
            return {
                success: true,
                message: 'Notification sent'
            };
        } else {
            const text = await response.text();
            console.error('[WhatsApp] Failed to send notification:', text);
            return {
                success: false,
                message: `Failed: ${text}`
            };
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[WhatsApp] Error sending notification:', error);
        return {
            success: false,
            message: errorMsg
        };
    }
}

/**
 * Format a Pix payment notification message for admin
 */
export function formatPixPaymentMessage(data: {
    planType: string;
    amount: number;
    userEmail?: string;
    subscriptionId?: string;
}): string {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return `${EMOJIS.MONEY_MOUTH} *NOVO PAGAMENTO PIX* ${EMOJIS.CHECK}
========================

${EMOJIS.CLIPBOARD} *PLANO:* ${data.planType.toUpperCase()}
${EMOJIS.BANKNOTE} *VALOR:* *R$ ${data.amount.toFixed(2).replace('.', ',')}*
${EMOJIS.EMAIL} *CLIENTE:* ${data.userEmail || 'N/A'}
${EMOJIS.LINK} *ID:* \`${data.subscriptionId || 'N/A'}\`
${EMOJIS.CLOCK} *DATA:* ${now}

========================
${EMOJIS.ROCKET} _Confirme o recebimento e ative a assinatura no painel._`;
}

