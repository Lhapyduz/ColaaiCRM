import type { Metadata } from "next";

export const metadata: Metadata = {
    // Basic Meta Tags
    title: "Cola Aí - Sistema de Gestão para Lanchonetes | Pedidos, Entregas e Fidelidade",
    description: "Sistema completo para gerenciar sua lanchonete. Controle pedidos, entregas, estoque, fidelidade de clientes e muito mais. Teste grátis por 7 dias!",

    // Keywords
    keywords: [
        "sistema para lanchonete",
        "gestão de pedidos",
        "controle de entregas",
        "software para hotdog",
        "programa para hamburgueria",
        "cardápio digital",
        "PDV lanchonete",
        "sistema de vendas",
        "programa de fidelidade",
        "controle de estoque",
        "gestão de restaurante",
        "sistema delivery",
        "app para lanchonete",
        "CRM para food service"
    ].join(", "),

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "https://colaai.com.br/vendas",
        siteName: "Cola Aí",
        title: "Cola Aí - Transforme sua Lanchonete em uma Máquina de Vendas",
        description: "O sistema #1 para lanchonetes. Gerencie pedidos, fidelidade, entregas e estoque. Comece grátis!",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Cola Aí - Sistema de Gestão para Lanchonetes",
            },
        ],
    },

    // Twitter Card
    twitter: {
        card: "summary_large_image",
        title: "Cola Aí - Sistema de Gestão para Lanchonetes",
        description: "O sistema #1 para lanchonetes. Gerencie pedidos, fidelidade, entregas e estoque. Teste grátis por 7 dias!",
        images: ["/og-image.png"],
    },

    // Robots
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },

    // Verification (adicione seus IDs reais)
    // verification: {
    //     google: "seu-google-site-verification",
    // },

    // Alternate languages
    alternates: {
        canonical: "https://colaai.com.br/vendas",
    },

    // Category
    category: "software",

    // Authors
    authors: [{ name: "Cola Aí" }],

    // Creator
    creator: "Cola Aí",

    // Publisher
    publisher: "Cola Aí",
};

export default function VendasLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
