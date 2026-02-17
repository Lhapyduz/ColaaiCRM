import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const COLA_AI_LOGO = 'https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp';

/**
 * Detecta o MIME type baseado na extensão da URL
 */
function detectMimeType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.webp')) return 'image/webp';
    if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
    if (lower.includes('.svg')) return 'image/svg+xml';
    return 'image/png'; // default
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('app_name, logo_url, primary_color')
        .eq('public_slug', slug)
        .single();

    if (error || !settings) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Usar a logo do negócio para os ícones, ou o fallback do Cola Aí
    const logoUrl = settings.logo_url || COLA_AI_LOGO;
    const mimeType = detectMimeType(logoUrl);
    const themeColor = settings.primary_color || '#ff6b35';

    const manifest = {
        name: settings.app_name || 'Cardápio Digital',
        short_name: settings.app_name || 'Cardápio',
        description: `Peça online em ${settings.app_name}! Cardápio digital com preços atualizados.`,
        start_url: `/menu/${slug}?utm_source=pwa`,
        scope: `/menu/${slug}/`,
        id: `/menu/${slug}/`,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f0f',
        theme_color: themeColor,
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['food', 'shopping'],
        // Ícones usando a logo do negócio
        icons: [
            {
                src: logoUrl,
                sizes: '192x192',
                type: mimeType,
                purpose: 'any',
            },
            {
                src: logoUrl,
                sizes: '512x512',
                type: mimeType,
                purpose: 'any',
            },
            {
                src: logoUrl,
                sizes: '512x512',
                type: mimeType,
                purpose: 'maskable',
            },
        ],
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
            // Cache curto (5 min) para que mudanças de logo reflitam rápido
            'Cache-Control': 'public, max-age=300, must-revalidate',
        },
    });
}
