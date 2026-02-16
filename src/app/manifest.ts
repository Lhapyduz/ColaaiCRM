import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Cola Aí - CRM para Lanches',
        short_name: 'Cola Aí',
        description: 'Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f0f0f',
        theme_color: '#ff6b35',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
            {
                src: '/logo-colaai.webp',
                sizes: '512x512',
                type: 'image/webp',
                purpose: 'maskable',
            },
            {
                src: '/logo-cola-ai.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
