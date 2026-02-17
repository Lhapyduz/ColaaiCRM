import { Metadata, Viewport } from 'next';
import { createClient } from '@/utils/supabase/server';

const COLA_AI_LOGO = 'https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    // Buscar dados da loja para metadados dinâmicos (iOS e Android)
    let logoUrl = COLA_AI_LOGO;
    let appName = 'Cardápio Digital';
    let themeColor = '#ff6b35';

    try {
        const supabase = await createClient();
        const { data: settings } = await supabase
            .from('user_settings')
            .select('app_name, logo_url, primary_color')
            .eq('public_slug', slug)
            .single();

        if (settings) {
            logoUrl = settings.logo_url || COLA_AI_LOGO;
            appName = settings.app_name || 'Cardápio Digital';
            themeColor = settings.primary_color || '#ff6b35';
        }
    } catch {
        // Fallback silencioso — usa valores padrão
    }

    return {
        title: appName,
        description: `Peça online em ${appName}!`,
        manifest: `/api/manifest/${slug}`,
        // Icons — essencial para Android, iOS e Windows
        icons: {
            icon: [
                { url: logoUrl, sizes: '192x192' },
                { url: logoUrl, sizes: '512x512' },
            ],
            apple: [
                { url: logoUrl, sizes: '180x180' },
            ],
        },
        // Apple Web App — iOS PWA nativo
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default',
            title: appName,
        },
        // Desabilitar detecção automática de telefone
        formatDetection: {
            telephone: false,
        },
        // Open Graph para compartilhamento
        openGraph: {
            title: appName,
            description: `Peça online em ${appName}!`,
            images: [{ url: logoUrl, width: 512, height: 512 }],
        },
        other: {
            'mobile-web-app-capable': 'yes',
            'apple-mobile-web-app-capable': 'yes',
            'apple-mobile-web-app-status-bar-style': 'default',
            'apple-mobile-web-app-title': appName,
            'application-name': appName,
            'msapplication-TileColor': '#0f0f0f',
            'msapplication-TileImage': logoUrl,
            'msapplication-tap-highlight': 'no',
            // Samsung Internet
            'theme-color': themeColor,
        },
    };
}

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
    const { slug } = await params;
    let themeColor = '#ff6b35';
    try {
        const supabase = await createClient();
        const { data: settings } = await supabase
            .from('user_settings')
            .select('primary_color')
            .eq('public_slug', slug)
            .single();
        if (settings?.primary_color) themeColor = settings.primary_color;
    } catch { /* fallback */ }
    return { themeColor };
}

export default function MenuLayout({ children }: LayoutProps) {
    return <>{children}</>;
}
