import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { RouteGuard } from "@/components/RouteGuard";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "Cola Aí - CRM para Lanches",
  description: "Sistema completo de gestão para negócios de lanches, hotdogs, porções e bebidas.",
  keywords: "crm, lanches, hotdog, gestão, pedidos, entregas",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body>
        <AuthProvider>
          <SubscriptionProvider>
            <OfflineProvider>
              <EmployeeProvider>
                <RouteGuard>
                  <KeyboardShortcutsProvider>
                    {children}
                  </KeyboardShortcutsProvider>
                </RouteGuard>
              </EmployeeProvider>
            </OfflineProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

