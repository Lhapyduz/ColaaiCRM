import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendTelegramNotification, formatPixTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const { planType, amount, billingPeriod } = await req.json();

        if (!planType || !amount) {
            return new NextResponse('Missing planType or amount', { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[PIX Notification] Manual notification from user:', user.id, 'Plan:', planType);

        // Format and send telegram message
        const telegramMessage = formatPixTelegramMessage({
            planType: `${planType} (${billingPeriod === 'annual' ? 'Anual' : 'Mensal'})`,
            amount: amount,
            userEmail: user.email,
            subscriptionId: `MANUAL-${user.id.substring(0, 8)}`
        });

        const result = await sendTelegramNotification(telegramMessage);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Notificação enviada com sucesso ao administrador.'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Falha ao enviar notificação.'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[PIX Notification] Error:', error);
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
}
