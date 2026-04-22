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

// Emoji constants using surrogate pairs for maximum compatibility
export const EMOJIS = {
    CLIPBOARD: '\uD83D\uDCCB',
    COOK: '\uD83D\uDC68\u200D\uD83C\uDF73',
    COOK_PAN: '\uD83C\uDF73',
    CHECK: '\u2705',
    TRUCK: '\uD83D\uDE9A',
    SCOOTER: '\uD83D\uDEF5',
    CELEBRATION: '\uD83C\uDF89',
    HEART: '\u2764\uFE0F',
    CANCEL: '\u274C',
    BURGER: '\uD83C\uDF54',
    FRIES: '\uD83C\uDF5F',
    USER: '\uD83D\uDC64',
    PHONE: '\uD83D\uDCF1',
    LOCATION: '\uD83D\uDCCD',
    HOUSE: '\uD83C\uDFE0',
    NEIGHBORHOOD: '\uD83C\uDFD8\uFE0F',
    STORE: '\uD83C\uDFEA',
    PACKAGE: '\uD83D\uDCE6',
    MEMO: '\uD83D\uDCDD',
    MONEY_BAG: '\uD83D\uDCB0',
    BANKNOTE: '\uD83D\uDCB5',
    CARD: '\uD83D\uDCB3',
    COUPON: '\uD83C\uDFF7\uFE0F',
    ZAP: '\u26A1',
    WAVE: '\uD83D\uDC4B',
    SPARKLES: '\u2728',
    ROCKET: '\uD83D\uDE80',
    STAR: '\u2B50',
    SPEECH: '\uD83D\uDCAC',
    NUMBERS: '\uD83D\uDD22',
    MONEY_MOUTH: '\uD83E\uDD11',
    CLOCK: '\u23F0',
    LINK: '\uD83D\uDD17',
    EMAIL: '\uD83D\uDCE7',
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

    // Using api.whatsapp.com for better redirect handling with emojis
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
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

