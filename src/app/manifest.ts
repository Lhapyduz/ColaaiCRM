import { MetadataRoute } from 'next'

const COLA_AI_LOGO = 'https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Cola Aí - Gestão Inteligente',
        short_name: 'Cola Aí',
        description: 'Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f0f',
        theme_color: '#ff6b35',
        categories: ['business', 'food', 'productivity'],
        lang: 'pt-BR',
        dir: 'ltr',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: COLA_AI_LOGO,
                sizes: '512x512',
                type: 'image/webp',
                purpose: 'any',
            },
        ],
        shortcuts: [
            {
                name: 'Vendas',
                short_name: 'Vendas',
                url: '/vendas',
                icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
            },
            {
                name: 'Produtos',
                short_name: 'Produtos',
                url: '/produtos',
                icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
            },
        ],
    }
}
