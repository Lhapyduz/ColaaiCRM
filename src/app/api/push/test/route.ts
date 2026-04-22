import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/services/communication/pushNotification';

// Rota para testar push notification
// GET /api/push/test?userId=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId parameter' },
                { status: 400 }
            );
        }

        console.log(`[Push Test] Enviando notificação de teste para userId: ${userId}`);

        const result = await sendPushToUser(userId, {
            title: '🔔 Teste de Notificação!',
            body: 'Se você está vendo isso, as notificações push estão funcionando!',
            url: '/dashboard',
        });

        console.log(`[Push Test] Resultado:`, result);

        return NextResponse.json({
            success: true,
            message: 'Notificação de teste enviada!',
            ...result
        });
    } catch (error) {
        console.error('[Push Test] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
