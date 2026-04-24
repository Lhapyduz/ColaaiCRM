import { CustomerCRM } from '@/components/crm/CustomerListTab';

export interface CustomerAnalytics {
    id: string;
    avgOrderValue: number;
    ltvEstimate: number;
    monthsSinceLastOrder: number;
    churnRisk: 'active' | 'lapsing' | 'at_risk' | 'churned';
    engagementScore: number;
    isNew: boolean;
    isReturning: boolean;
    isLoyal: boolean;
}

export function calculateCustomerLTV(customer: CustomerCRM, totalRevenue?: number): number {
    if (!customer.total_orders || customer.total_orders === 0) return 0;
    return (customer.total_spent || 0) / customer.total_orders;
}

export function estimateLTV(avgOrderValue: number, monthlyFrequency: number, months = 24): number {
    if (!avgOrderValue || !monthlyFrequency) return 0;
    return avgOrderValue * monthlyFrequency * months;
}

export function calculateChurnRisk(lastOrderDate: string | null | undefined): {
    risk: 'active' | 'lapsing' | 'at_risk' | 'churned';
    monthsSinceLastOrder: number;
} {
    if (!lastOrderDate) {
        return { risk: 'churned', monthsSinceLastOrder: 99 };
    }

    const now = new Date();
    const date = new Date(lastOrderDate);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 90) return { risk: 'churned', monthsSinceLastOrder: Math.floor(diffDays / 30) };
    if (diffDays > 60) return { risk: 'at_risk', monthsSinceLastOrder: Math.floor(diffDays / 30) };
    if (diffDays > 30) return { risk: 'lapsing', monthsSinceLastOrder: 1 };
    
    return { risk: 'active', monthsSinceLastOrder: 0 };
}

export function calculateEngagementScore(
    daysSinceLastOrder: number,
    totalOrders: number,
    tier?: string
): number {
    let score = 100;
    score -= Math.min(daysSinceLastOrder * 2, 80);
    score += Math.min(totalOrders * 4, 30);
    if (tier === 'gold' || tier === 'platinum') score += 20;
    else if (tier === 'silver') score += 10;
    
    return Math.max(0, Math.min(100, score));
}

export function getCustomerAnalytics(
    customer: CustomerCRM,
    ordersLast30Days: number = 0
): CustomerAnalytics {
    const avgOrderValue = calculateCustomerLTV(customer);
    const { risk: churnRisk, monthsSinceLastOrder } = calculateChurnRisk(customer.last_order_date);
    const engagementScore = calculateEngagementScore(
        monthsSinceLastOrder * 30,
        customer.total_orders || 0,
        undefined
    );

    const estimatedMonthlyFrequency = ordersLast30Days > 0 ? ordersLast30Days : (customer.total_orders || 0) / 3;
    const ltvEstimate = estimateLTV(avgOrderValue, estimatedMonthlyFrequency);

    return {
        id: customer.id,
        avgOrderValue,
        ltvEstimate,
        monthsSinceLastOrder,
        churnRisk,
        engagementScore,
        isNew: (customer.total_orders || 0) <= 1,
        isReturning: (customer.total_orders || 0) >= 2,
        isLoyal: (customer.total_orders || 0) >= 5
    };
}

export function getChurnRiskColor(risk: CustomerAnalytics['churnRisk']): string {
    switch (risk) {
        case 'active': return 'text-green-600 bg-green-100';
        case 'lapsing': return 'text-yellow-600 bg-yellow-100';
        case 'at_risk': return 'text-orange-600 bg-orange-100';
        case 'churned': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
    }
}

export function getChurnRiskLabel(risk: CustomerAnalytics['churnRisk']): string {
    switch (risk) {
        case 'active': return 'Ativo';
        case 'lapsing': return 'Inativo';
        case 'at_risk': return 'Risco';
        case 'churned': return 'Perdido';
        default: return 'Desconhecido';
    }
}

export function getEngagementColor(score: number): string {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
}