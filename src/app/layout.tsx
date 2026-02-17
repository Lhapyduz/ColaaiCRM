import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { RouteGuard } from "@/components/RouteGuard";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import QueryProvider from "@/components/providers/QueryProvider";
import PWARegistry from "@/components/providers/PWARegistry";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope'
});

export const metadata: Metadata = {
  title: "Cola Aí - Gestão Inteligente",
  description: "Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.",
  keywords: "crm, lanches, hotdog, gestão, pedidos, entregas",
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Cola Aí",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'theme-color': '#ff6b35',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Cola Aí',
    'msapplication-TileColor': '#0f0f0f',
    'msapplication-TileImage': '/icon-192x192.png',
    'msapplication-tap-highlight': 'no',
    'dns-prefetch': [
      'https://koxmxvutlxlikeszwyir.supabase.co',
      'https://js.stripe.com',
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://koxmxvutlxlikeszwyir.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://koxmxvutlxlikeszwyir.supabase.co" />
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" href="https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp" />
        <meta name="theme-color" content="#ff6b35" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="application-name" content="Cola Aí - Gestão Inteligente" />
        <meta name="apple-mobile-web-app-title" content="Cola Aí" />
        <meta name="msapplication-navbutton-color" content="#ff6b35" />
        <meta name="msapplication-starturl" content="/" />
      </head>
      <body>
        <ErrorBoundary>
          <QueryProvider>
            <PWARegistry />
            <Toaster position="top-center" reverseOrder={false} />
            <AuthProvider>
              <SubscriptionProvider>
                <OfflineProvider>
                  <EmployeeProvider>
                    <ToastProvider>
                      <RouteGuard>
                        <KeyboardShortcutsProvider>
                          {children}
                        </KeyboardShortcutsProvider>
                      </RouteGuard>
                    </ToastProvider>
                  </EmployeeProvider>
                </OfflineProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

