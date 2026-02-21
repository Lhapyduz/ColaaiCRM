// Telegram Bot Notification Utility
// Envia notificações para seu Telegram quando cliente confirmar pagamento Pix
//
// SETUP:
// 1. Abra @BotFather no Telegram
// 2. Envie /newbot e siga as instruções
// 3. Copie o token e adicione em TELEGRAM_BOT_TOKEN no .env.local
// 4. Inicie uma conversa com seu bot (envie /start)
// 5. Acesse: https://api.telegram.org/bot<TOKEN>/getUpdates
// 6. Copie seu chat_id e adicione em TELEGRAM_CHAT_ID no .env.local

interface TelegramResult {
    success: boolean;
    message: string;
}

/**
 * Envia uma mensagem via Telegram Bot API
 */
export async function sendTelegramNotification(
    message: string
): Promise<TelegramResult> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.warn('[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurado');
        return {
            success: false,
            message: 'Telegram not configured'
        };
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();

        if (data.ok) {
            console.log('[Telegram] Notificação enviada com sucesso');
            return {
                success: true,
                message: 'Notification sent'
            };
        } else {
            console.error('[Telegram] Erro ao enviar:', data.description);
            return {
                success: false,
                message: data.description || 'Unknown error'
            };
        }
    } catch (error) {
        console.error('[Telegram] Erro:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Formata mensagem de pagamento Pix para Telegram
 */
export function formatPixTelegramMessage(data: {
    planType: string;
    amount: number;
    userEmail?: string;
    subscriptionId?: string;
}): string {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return `💰 *NOVO PAGAMENTO PIX*

📋 *Plano:* ${data.planType}
💵 *Valor:* R$ ${data.amount.toFixed(2).replace('.', ',')}
📧 *Cliente:* ${data.userEmail || 'N/A'}
🔗 *Subscription:* \`${data.subscriptionId || 'N/A'}\`
⏰ *Data:* ${now}

_Confirme o recebimento e ative a assinatura no Stripe._`;
}
