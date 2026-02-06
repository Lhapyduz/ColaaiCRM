import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role para acessar device_fingerprints (tabela protegida por RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Rate limiting simples em memória (em produção usar Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests por minuto
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto

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

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Muitas tentativas. Tente novamente em 1 minuto.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { fingerprintHash } = body;

        if (!fingerprintHash || typeof fingerprintHash !== 'string') {
            return NextResponse.json(
                { error: 'Fingerprint inválido' },
                { status: 400 }
            );
        }

        // Verifica se fingerprint já usou trial
        const { data: existing, error: lookupError } = await supabaseAdmin
            .from('device_fingerprints')
            .select('id, trial_used, first_user_id, created_at')
            .eq('fingerprint_hash', fingerprintHash)
            .maybeSingle();

        if (lookupError) {
            console.error('[Fingerprint Verify] Lookup error:', lookupError);
            // Em caso de erro, permite trial (fail-open para UX)
            return NextResponse.json({ canTrial: true, reason: null });
        }

        if (existing && existing.trial_used) {
            return NextResponse.json({
                canTrial: false,
                reason: 'Este dispositivo já utilizou o período de teste gratuito. Por favor, escolha um plano para continuar.',
                firstUsed: existing.created_at,
            });
        }

        return NextResponse.json({
            canTrial: true,
            reason: null,
        });
    } catch (error) {
        console.error('[Fingerprint Verify] Error:', error);
        // Fail-open: em caso de erro, permite trial
        return NextResponse.json({ canTrial: true, reason: null });
    }
}
