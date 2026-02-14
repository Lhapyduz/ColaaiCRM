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
  title: "Cola Aí - CRM para Lanches",
  description: "Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.",
  keywords: "crm, lanches, hotdog, gestão, pedidos, entregas",
  alternates: {
    canonical: '/',
  },
  other: {
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
      </head>
      <body>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  );
}

