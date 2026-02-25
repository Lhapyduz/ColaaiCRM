'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

interface LoyaltyInput {
    userId: string;
    orderId: string;
    orderNumber: number;
    orderTotal: number;
    customerPhone: string;
}

/**
 * Server Action assíncrona para atualizar pontos de fidelidade em background.
 * Chamada com `void updateLoyaltyPoints(...)` — o frontend NÃO espera o resultado.
 */
export async function updateLoyaltyPoints(input: LoyaltyInput) {
    const { userId, orderId, orderNumber, orderTotal, customerPhone } = input;
    const supabase = supabaseAdmin;

    try {
        const cleanPhone = customerPhone.replace(/\D/g, '');

        const { data: customer } = await supabase
            .from('customers')
            .select('id, total_spent, total_points')
            .eq('user_id', userId)
            .eq('phone', cleanPhone)
            .single();

        if (!customer) return;

        const { data: settings } = await supabase
            .from('loyalty_settings')
            .select('points_per_real')
            .eq('user_id', userId)
            .single();

        const pointsPerReal = settings?.points_per_real || 1;
        const pointsEarned = Math.floor(orderTotal * pointsPerReal);

        await supabase
            .from('customers')
            .update({
                total_spent: (customer.total_spent || 0) + orderTotal,
                total_points: (customer.total_points || 0) + pointsEarned,
            })
            .eq('id', customer.id);

        if (pointsEarned > 0) {
            await supabase.from('points_transactions').insert({
                user_id: userId,
                customer_id: customer.id,
                points: pointsEarned,
                type: 'earned',
                description: `Pedido #${orderNumber}`,
                order_id: orderId,
            });
        }
    } catch (error) {
        // Log sem afetar o UI — essa ação roda em background
        console.error('Background loyalty update failed:', error);
    }
}
