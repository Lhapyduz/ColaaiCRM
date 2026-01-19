// Pix Configuration for Subscription Payments
// This file contains the hardcoded Pix credentials for receiving subscription payments

export const PIX_CONFIG = {
    pixKey: '07632364978',
    pixKeyType: 'cpf' as const,
    merchantName: 'Cola Ai',
    merchantCity: 'Guaratuba', // Update this to your actual city (max 15 chars, no accents)
};

// Plan prices in BRL
export const PLAN_PRICES = {
    Basico: 49,
    'Avançado': 79,
    Profissional: 149,
} as const;

export type PlanPriceKey = keyof typeof PLAN_PRICES;
