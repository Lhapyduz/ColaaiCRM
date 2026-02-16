import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Cola Aí - Gestão Inteligente',
        short_name: 'Cola Aí',
        description: 'Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f0f0f',
        theme_color: '#ff6b35',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
