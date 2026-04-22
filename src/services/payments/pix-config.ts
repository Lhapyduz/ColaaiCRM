// Pix Configuration for Subscription Payments
// This file contains plan pricing for AbacatePay PIX payments

export const PIX_CONFIG = {
    pixKey: '07632364978',
    pixKeyType: 'cpf' as const,
    merchantName: 'Cola Ai',
    merchantCity: 'Guaratuba',
};

// Plan prices in BRL (monthly)
export const PLAN_PRICES = {
    Basico: 49,
    'Avançado': 79,
    Profissional: 149,
} as const;

// Plan prices in BRL (annual - 10 months price = 2 months free)
export const PLAN_PRICES_ANNUAL = {
    Basico: 490,
    'Avançado': 790,
    Profissional: 1490,
} as const;

// Plan prices in cents for AbacatePay
export const PLAN_PRICES_CENTS = {
    monthly: {
        Basico: 4900,
        'Avançado': 7900,
        Profissional: 14900,
    },
    annual: {
        Basico: 49000,
        'Avançado': 79000,
        Profissional: 149000,
    }
} as const;

export type PlanPriceKey = keyof typeof PLAN_PRICES;
export type BillingPeriod = 'monthly' | 'annual';

// Helper to get price based on period
export function getPlanPrice(plan: PlanPriceKey, period: BillingPeriod = 'monthly'): number {
    return period === 'annual' ? PLAN_PRICES_ANNUAL[plan] : PLAN_PRICES[plan];
}

// Helper to get price in cents
export function getPlanPriceCents(plan: PlanPriceKey, period: BillingPeriod = 'monthly'): number {
    return PLAN_PRICES_CENTS[period][plan];
}

// Calculate period duration in days
export function getPeriodDays(period: BillingPeriod): number {
    return period === 'annual' ? 365 : 30;
}
