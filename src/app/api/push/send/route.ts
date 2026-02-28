import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/pushNotification';

// IMPORTANTE: Esta rota só deve ser chamada pelo próprio sistema ou admin
// Num cenário real, adicione validação de API Key ou Token admin
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, title, message, url } = body;

        if (!userId || !title || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, title, message' },
                { status: 400 }
            );
        }

        // Validação (idealmente protegida por Supabase Auth)
        // Para simplificar nessa versão enviaremos via API sem key service role (visto que o token é gerado cliente side)
        // O ideal é passar o JWT do usuário e validar.
        const result = await sendPushToUser(userId, {
            title,
            body: message,
            url
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[Push Send API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
