import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Cola Aí - Gestão de Pedidos",
        short_name: "Cola Aí",
        description: "Gestão inteligente de pedidos PWA Off-line First.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ef4444",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
