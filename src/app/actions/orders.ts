'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { OrderSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createOrder(rawOrder: z.infer<typeof OrderSchema>) {
    // 1. Validar dados com Zod
    const validated = OrderSchema.safeParse(rawOrder);
    if (!validated.success) {
        console.error('Validation Error:', validated.error.flatten().fieldErrors);
        return { error: validated.error.flatten().fieldErrors };
    }

    const order = validated.data;
    // O checkout roda no Servidor. Como clientes são anônimos, usamos supabaseAdmin 
    // para realizar a leitura/inserção de forma atômica e segura contornando RLS, 
    // permitindo que o RLS da tabela 'orders' seja restritivo apenas para os Lojistas.
    const supabase = supabaseAdmin;

    // 2. Pegar o próximo número do pedido para o usuário (vendedor)
    const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('user_id', order.user_id)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

    const nextOrderNumber = (lastOrder?.order_number || 0) + 1;

    // 3. Inserir pedido
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: order.user_id,
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            customer_address: order.deliveryMode === 'delivery'
                ? `${order.street}, ${order.houseNumber} - ${order.neighborhood}${order.complement ? ` (${order.complement})` : ''}`
                : 'Retirada no Local',
            is_delivery: order.deliveryMode === 'delivery',
            payment_method: order.paymentMethod === 'cash' ? 'money' : (order.paymentMethod === 'card' ? 'credit' : 'pix'),
            subtotal: order.subtotal,
            delivery_fee: order.deliveryFee,
            total: order.total,
            status: 'pending',
            payment_status: 'pending',
            order_number: nextOrderNumber,
            notes: (order.observations ? `OBS: ${order.observations}\n` : '') +
                (order.street ? `Endereço: ${order.street}, ${order.houseNumber}` : '')
        })
        .select()
        .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
        return { error: 'Falha ao salvar o pedido no banco de dados.' };
    }

    // 4. Inserir itens do pedido
    const orderItems = order.items.map(item => {
        const addonText = item.addons?.length
            ? ` (Adicionais: ${item.addons.map(a => a.name).join(', ')})`
            : '';

        return {
            order_id: orderData.id,
            product_id: item.productId,
            product_name: item.name + addonText,
            quantity: item.quantity,
            unit_price: item.price,
            total: (item.price + (item.addons?.reduce((acc, a) => acc + a.price, 0) || 0)) * item.quantity,
            notes: item.notes
        };
    });

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        console.error('Error creating order items:', itemsError);
        return { error: 'Pedido salvo, mas houve erro nos itens.' };
    }

    revalidatePath('/pedidos');
    revalidatePath('/dashboard');

    try {
        // Disparar a notificação push via server-side de forma separada
        const { notifyNewOrder } = await import('@/lib/pushNotification');
        // Usamos catch pra evitar que um erro no firebase/web-push jogue exceção pro cliente
        notifyNewOrder(order.user_id, nextOrderNumber, order.customerName, order.total).catch(console.error);
    } catch (e) {
        console.error('Failed to load push library or send push:', e);
    }

    return { success: true, orderId: orderData.id, orderNumber: nextOrderNumber };
}
