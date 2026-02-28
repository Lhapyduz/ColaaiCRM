import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos o Service Role Key aqui porque o RLS pode bloquear inserts
// de usuários não autenticados na sessão Next.js (se a request vier diferente)
// Mas o ideal é usar a sessão do usuário. Vamos usar supabase auth.
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: Request) {
    try {
        const { subscription, userId } = await request.json();

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json(
                { error: 'Invalid subscription object' },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Inserir ou atualizar via upsert (para evitar duplicatas do mesmo endpoint)
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            }, {
                onConflict: 'user_id, endpoint'
            });

        if (error) {
            console.error('[Push Subscribe] DB Error:', error);
            return NextResponse.json(
                { error: 'Failed to save subscription' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push Subscribe] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return NextResponse.json(
                { error: 'Endpoint is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) {
            console.error('[Push Unsubscribe] DB Error:', error);
            return NextResponse.json(
                { error: 'Failed to delete subscription' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push Unsubscribe] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
