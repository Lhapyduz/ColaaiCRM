'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { getStatusLabel } from '@/components/ui/StatusBadge';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
interface OrderBase {
    id: string;
    status: string;
    payment_status: string;
}

interface UpdateStatusVars {
    orderId: string;
    newStatus: string;
}

interface UpdatePaymentVars {
    orderId: string;
}

interface DeleteOrderVars {
    orderId: string;
}

interface MutationContext<T> {
    previousOrders: T[] | undefined;
}

// ────────────────────────────────────────────
// Hook: useUpdateOrderStatus
// Optimistic update ao mudar status do pedido
// ────────────────────────────────────────────
export function useUpdateOrderStatus<T extends OrderBase>(queryKey: readonly unknown[]) {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation<void, Error, UpdateStatusVars, MutationContext<T>>({
        mutationFn: async ({ orderId, newStatus }) => {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
        },

        // Optimistic Update: muda a UI ANTES da resposta do servidor
        onMutate: async ({ orderId, newStatus }) => {
            // Cancela qualquer refetch em andamento para evitar race conditions
            await queryClient.cancelQueries({ queryKey });

            // Salva o estado anterior para rollback
            const previousOrders = queryClient.getQueryData<T[]>(queryKey);

            // Atualiza o cache otimisticamente
            queryClient.setQueryData<T[]>(queryKey, (old) => {
                if (!old) return old;
                return old.map((order) =>
                    order.id === orderId
                        ? { ...order, status: newStatus }
                        : order
                );
            });

            return { previousOrders };
        },

        // Rollback em caso de erro
        onError: (_err, _vars, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(queryKey, context.previousOrders);
            }
            toast.error('Erro ao atualizar status do pedido');
        },

        onSuccess: (_data, { newStatus }) => {
            toast.success(`Status atualizado para ${getStatusLabel(newStatus)}`);
        },

        // Sync final com o servidor
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
}

// ────────────────────────────────────────────
// Hook: useUpdatePaymentStatus
// Optimistic update ao confirmar pagamento
// ────────────────────────────────────────────
export function useUpdatePaymentStatus<T extends OrderBase>(queryKey: readonly unknown[]) {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation<void, Error, UpdatePaymentVars, MutationContext<T>>({
        mutationFn: async ({ orderId }) => {
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
        },

        onMutate: async ({ orderId }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousOrders = queryClient.getQueryData<T[]>(queryKey);

            queryClient.setQueryData<T[]>(queryKey, (old) => {
                if (!old) return old;
                return old.map((order) =>
                    order.id === orderId
                        ? { ...order, payment_status: 'paid' }
                        : order
                );
            });

            return { previousOrders };
        },

        onError: (_err, _vars, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(queryKey, context.previousOrders);
            }
            toast.error('Erro ao atualizar status de pagamento');
        },

        onSuccess: () => {
            toast.success('Pagamento confirmado!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
}

// ────────────────────────────────────────────
// Hook: useDeleteOrder
// Optimistic update ao excluir pedido
// ────────────────────────────────────────────
export function useDeleteOrder<T extends OrderBase>(queryKey: readonly unknown[]) {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation<void, Error, DeleteOrderVars, MutationContext<T>>({
        mutationFn: async ({ orderId }) => {
            // Deleta itens primeiro por causa de FK constraints
            await supabase.from('order_items').delete().eq('order_id', orderId);
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
        },

        onMutate: async ({ orderId }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousOrders = queryClient.getQueryData<T[]>(queryKey);

            queryClient.setQueryData<T[]>(queryKey, (old) => {
                if (!old) return old;
                return old.filter((order) => order.id !== orderId);
            });

            return { previousOrders };
        },

        onError: (_err, _vars, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(queryKey, context.previousOrders);
            }
            toast.error('Erro ao excluir pedido');
        },

        onSuccess: () => {
            toast.success('Pedido excluído');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
}
