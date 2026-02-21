// AbacatePay Configuration and Utilities
// Handles PIX payment creation and management via AbacatePay API

import { BillingPeriod, PlanPriceKey, getPlanPriceCents, getPeriodDays } from './pix-config';

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

// Use prod key if available, otherwise fall back to dev key
const API_KEY = process.env.ABACATEPAY_API_KEY_PROD || process.env.ABACATEPAY_API_KEY_DEV;

export interface AbacatepayCustomer {
    id: string;
    metadata: {
        name: string;
        email: string;
        cellphone: string;
        taxId: string;
    };
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
    methods: ('PIX' | 'CARD')[];
    products: AbacatepayProduct[];
    returnUrl: string;
    completionUrl: string;
    customerId: string; // Agora obrigatório - deve ser obtido antes
    metadata?: Record<string, string>;
}

export interface CreateBillingResponse {
    error: string | null;
    billing: AbacatepayBilling | null;
}

// ============ CUSTOMER FUNCTIONS ============

/**
 * Lista todos os clientes e busca por email
 */
export async function findCustomerByEmail(email: string): Promise<AbacatepayCustomer | null> {
    try {
        console.log('[AbacatePay] Searching for customer by email:', email);

        const response = await fetch(`${ABACATEPAY_API_URL}/customer/list`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('[AbacatePay] Error listing customers:', data);
            return null;
        }

        const customers: AbacatepayCustomer[] = data.data || [];
        const found = customers.find(c => c.metadata?.email === email);

        if (found) {
            console.log('[AbacatePay] Customer found:', found.id);
        } else {
            console.log('[AbacatePay] Customer not found for email:', email);
        }

        return found || null;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AbacatePay] Exception finding customer:', errorMsg);
        return null;
    }
}

/**
 * Cria um novo cliente na AbacatePay
 */
export async function createCustomer(params: {
    name: string;
    email: string;
    cellphone?: string;
    taxId?: string;
}): Promise<{ customer: AbacatepayCustomer | null; error: string | null }> {
    try {
        console.log('[AbacatePay] Creating new customer:', params.email);

        const response = await fetch(`${ABACATEPAY_API_URL}/customer/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                name: params.name,
                email: params.email,
                cellphone: params.cellphone || '(00) 00000-0000',
                taxId: params.taxId || '000.000.000-00',
            }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return { customer: null, error: data.error || 'Failed to create customer' };
        }

        return { customer: data.data, error: null };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AbacatePay] Exception creating customer:', errorMsg);
        return { customer: null, error: errorMsg };
    }
}

/**
 * Obtém ou cria um cliente - fluxo principal
 */
export async function getOrCreateCustomer(params: {
    name: string;
    email: string;
}): Promise<{ customerId: string | null; error: string | null }> {
    // 1. Tentar encontrar cliente existente
    const existingCustomer = await findCustomerByEmail(params.email);

    if (existingCustomer) {
        return { customerId: existingCustomer.id, error: null };
    }

    // 2. Criar novo cliente
    const { customer, error } = await createCustomer({
        name: params.name,
        email: params.email,
    });

    if (error || !customer) {
        return { customerId: null, error: error || 'Failed to create customer' };
    }

    return { customerId: customer.id, error: null };
}

// ============ BILLING FUNCTIONS ============

/**
 * Creates a PIX billing in AbacatePay
 */
export async function createAbacatepayBilling(params: CreateBillingParams): Promise<CreateBillingResponse> {
    try {
        console.log('[AbacatePay] Creating billing for customer:', params.customerId);

        const response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(params),
        });

        const data = await response.json();

        // AbacatePay retorna HTTP 200 mesmo em erros, verificar campo success
        if (!response.ok || data.success === false || data.error) {
            console.error('[AbacatePay] Error creating billing:', data);
            return { error: data.error || 'Failed to create billing', billing: null };
        }

        return { error: null, billing: data.data || data.billing || data };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AbacatePay] Exception:', errorMsg);
        return { error: errorMsg, billing: null };
    }
}

/**
 * Gets billing details by ID
 */
export async function getAbacatepayBilling(billingId: string): Promise<AbacatepayBilling | null> {
    try {
        const response = await fetch(`${ABACATEPAY_API_URL}/billing/get?id=${billingId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error('[AbacatePay] Error fetching billing:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.data || data.billing || data;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AbacatePay] Exception:', errorMsg);
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
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error('[AbacatePay] Error listing billings:', await response.text());
            return [];
        }

        const data = await response.json();
        return data.data || data.billings || [];
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AbacatePay] Exception:', errorMsg);
        return [];
    }
}

// Re-export types and helpers from pix-config
export { getPlanPriceCents, getPeriodDays };
export type { PlanPriceKey, BillingPeriod };
