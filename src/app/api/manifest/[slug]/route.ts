import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

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

    const manifest = {
        name: settings.app_name || 'Cardápio Digital',
        short_name: settings.app_name || 'Cardápio',
        description: `Peça online em ${settings.app_name}!`,
        start_url: `/menu/${slug}?utm_source=pwa`,
        scope: `/menu/${slug}/`,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f0f',
        theme_color: settings.primary_color || '#ff6b35',
        icons: [
            {
                src: settings.logo_url || '/logo-colaai.webp',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: settings.logo_url || '/logo-colaai.webp',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            }
        ],
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
