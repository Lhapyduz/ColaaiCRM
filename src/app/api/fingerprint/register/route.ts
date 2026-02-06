import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Use service role para acessar device_fingerprints
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // Mais restritivo para registro
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

// Hash simples para IP (não armazenar IP bruto)
async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Limite de tentativas atingido. Tente novamente em 1 hora.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { fingerprintHash, userId, userAgent } = body;

        if (!fingerprintHash || typeof fingerprintHash !== 'string') {
            return NextResponse.json(
                { error: 'Fingerprint inválido' },
                { status: 400 }
            );
        }

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { error: 'User ID inválido' },
                { status: 400 }
            );
        }

        // Hash do IP para privacidade
        const ipHash = await hashIP(ip);

        // Registra uso de trial
        const { error: insertError } = await supabaseAdmin
            .from('device_fingerprints')
            .upsert({
                fingerprint_hash: fingerprintHash,
                first_user_id: userId,
                trial_used: true,
                ip_hash: ipHash,
                user_agent: (userAgent || '').substring(0, 500),
                last_seen_at: new Date().toISOString(),
            }, {
                onConflict: 'fingerprint_hash',
            });

        if (insertError) {
            console.error('[Fingerprint Register] Insert error:', insertError);
            return NextResponse.json(
                { error: 'Erro ao registrar dispositivo' },
                { status: 500 }
            );
        }

        console.log('[Fingerprint Register] Success for user:', userId);

        return NextResponse.json({
            success: true,
            message: 'Dispositivo registrado com sucesso',
        });
    } catch (error) {
        console.error('[Fingerprint Register] Error:', error);
        return NextResponse.json(
            { error: 'Erro interno' },
            { status: 500 }
        );
    }
}
