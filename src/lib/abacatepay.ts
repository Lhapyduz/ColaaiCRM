// AbacatePay Configuration and Utilities
// Handles PIX payment creation and management via AbacatePay API

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

// Use prod key if available, otherwise fall back to dev key
const API_KEY = process.env.ABACATEPAY_API_KEY_PROD || process.env.ABACATEPAY_API_KEY_DEV;


export interface AbacatepayCustomer {
    id: string;
    email: string;
    name: string;
    taxId?: string;
    cellphone: string;
}

export interface AbacatepayProduct {
    externalId: string;
    name: string;
    description?: string;
    quantity: number;
    price: number; // in cents
}

export interface AbacatepayBilling {
    id: string;
    url: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
    devMode: boolean;
    customer?: AbacatepayCustomer;
    pix?: {
        qrCode: string;
        qrCodeBase64: string;
        expiresAt: string;
    };
}

export interface CreateBillingParams {
    frequency: 'ONE_TIME' | 'MULTIPLE_PAYMENTS';
    methods: ('PIX')[];
    products: AbacatepayProduct[];
    returnUrl: string;
    completionUrl?: string;
    customer?: {
        name: string;
        email: string;
        cellphone: string;
        taxId?: string;
    };
    metadata?: Record<string, string>;
}

export interface CreateBillingResponse {
    error: string | null;
    billing: AbacatepayBilling | null;
}

/**
 * Creates a PIX billing in AbacatePay
 */
export async function createAbacatepayBilling(params: CreateBillingParams): Promise<CreateBillingResponse> {
    try {
        const response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[AbacatePay] Error creating billing:', data);
            return { error: data.error || 'Failed to create billing', billing: null };
        }

        return { error: null, billing: data.data || data.billing || data };
    } catch (error: any) {
        console.error('[AbacatePay] Exception:', error);
        return { error: error.message, billing: null };
    }
}

/**
 * Gets billing details by ID
 */
export async function getAbacatepayBilling(billingId: string): Promise<AbacatepayBilling | null> {
    try {
        const response = await fetch(`${ABACATEPAY_API_URL}/billing/${billingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error('[AbacatePay] Error fetching billing:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.data || data.billing || data;
    } catch (error: any) {
        console.error('[AbacatePay] Exception:', error);
        return null;
    }
}

/**
 * Lists all billings
 */
export async function listAbacatepayBillings(): Promise<AbacatepayBilling[]> {
    try {
        const response = await fetch(`${ABACATEPAY_API_URL}/billing/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error('[AbacatePay] Error listing billings:', await response.text());
            return [];
        }

        const data = await response.json();
        return data.data || data.billings || [];
    } catch (error: any) {
        console.error('[AbacatePay] Exception:', error);
        return [];
    }
}

// Plan prices in cents for AbacatePay (they use cents)
export const ABACATEPAY_PLAN_PRICES = {
    Basico: 4900,      // R$ 49,00
    'Avançado': 7900,  // R$ 79,00
    Profissional: 14900, // R$ 149,00
} as const;

export type AbacatepayPlanType = keyof typeof ABACATEPAY_PLAN_PRICES;
