// Action Logger Utility
// Provides functions to log user actions for auditing

import { supabase } from './supabase';

export type ActionType =
    | 'create'
    | 'update'
    | 'delete'
    | 'view'
    | 'login'
    | 'logout'
    | 'print'
    | 'export'
    | 'status_change'
    | 'payment'
    | 'refund'
    | 'points_earned'
    | 'points_redeemed'
    | 'stock_movement';

export type EntityType =
    | 'order'
    | 'product'
    | 'category'
    | 'customer'
    | 'coupon'
    | 'ingredient'
    | 'reward'
    | 'addon'
    | 'settings'
    | 'report'
    | 'user';

export interface LogActionParams {
    actionType: ActionType;
    entityType: EntityType;
    entityId?: string;
    entityName?: string;
    description: string;
    metadata?: Record<string, unknown>;
}

/**
 * Helper to check if a string is a valid UUID
 */
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Log a user action to the database
 */
export async function logAction(params: LogActionParams): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { addActionLogDAL } = await import('./dataAccess');
        
        let entity_id = null;
        let metadata = params.metadata || {};

        if (params.entityId) {
            if (isValidUUID(params.entityId)) {
                entity_id = params.entityId;
            } else {
                // If it's not a UUID, don't pass it to the DB but preserve it in metadata
                metadata = { ...metadata, original_entity_id: params.entityId };
                console.warn(`[AuditLog] Invalid UUID provided for entityId: ${params.entityId}. Log ID: ${params.actionType}/${params.entityType}`);
            }
        }

        await addActionLogDAL({
            id: crypto.randomUUID(),
            user_id: user.id,
            action_type: params.actionType,
            entity_type: params.entityType,
            entity_id,
            entity_name: params.entityName || null,
            description: params.description,
            metadata,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        // Silent fail - don't interrupt user flow for logging errors
        console.error('Error logging action:', error);
    }
}


/**
 * Log order creation
 */
export function logOrderCreated(orderId: string, orderNumber: number, total: number): void {
    logAction({
        actionType: 'create',
        entityType: 'order',
        entityId: orderId,
        entityName: `Pedido #${orderNumber}`,
        description: `Novo pedido #${orderNumber} criado`,
        metadata: { order_number: orderNumber, total }
    });
}

/**
 * Log order status change
 */
export function logOrderStatusChange(orderId: string, orderNumber: number, oldStatus: string, newStatus: string): void {
    logAction({
        actionType: 'status_change',
        entityType: 'order',
        entityId: orderId,
        entityName: `Pedido #${orderNumber}`,
        description: `Status do pedido #${orderNumber} alterado de "${oldStatus}" para "${newStatus}"`,
        metadata: { old_status: oldStatus, new_status: newStatus }
    });
}

/**
 * Log payment received
 */
export function logPaymentReceived(orderId: string, orderNumber: number, amount: number, method: string): void {
    logAction({
        actionType: 'payment',
        entityType: 'order',
        entityId: orderId,
        entityName: `Pedido #${orderNumber}`,
        description: `Pagamento de R$ ${amount.toFixed(2)} recebido (${method})`,
        metadata: { amount, method }
    });
}

/**
 * Log product creation
 */
export function logProductCreated(productId: string, productName: string, price: number): void {
    logAction({
        actionType: 'create',
        entityType: 'product',
        entityId: productId,
        entityName: productName,
        description: `Produto "${productName}" criado`,
        metadata: { price }
    });
}

/**
 * Log product update
 */
export function logProductUpdated(productId: string, productName: string, changes: Record<string, unknown>): void {
    logAction({
        actionType: 'update',
        entityType: 'product',
        entityId: productId,
        entityName: productName,
        description: `Produto "${productName}" atualizado`,
        metadata: changes
    });
}

/**
 * Log product deletion
 */
export function logProductDeleted(productId: string, productName: string): void {
    logAction({
        actionType: 'delete',
        entityType: 'product',
        entityId: productId,
        entityName: productName,
        description: `Produto "${productName}" excluído`
    });
}

/**
 * Log report export
 */
export function logReportExported(reportType: string, dateRange: string): void {
    logAction({
        actionType: 'export',
        entityType: 'report',
        entityName: reportType,
        description: `Relatório "${reportType}" exportado (${dateRange})`,
        metadata: { report_type: reportType, date_range: dateRange }
    });
}

/**
 * Log settings update
 */
export function logSettingsUpdated(settingName: string): void {
    logAction({
        actionType: 'update',
        entityType: 'settings',
        entityName: settingName,
        description: `Configuração "${settingName}" atualizada`
    });
}

/**
 * Log ingredient created
 */
export function logIngredientCreated(ingredientId: string, name: string, unit: string): void {
    logAction({
        actionType: 'create',
        entityType: 'ingredient',
        entityId: ingredientId,
        entityName: name,
        description: `Ingrediente "${name}" adicionado ao estoque (${unit})`,
        metadata: { unit }
    });
}

/**
 * Log ingredient updated
 */
export function logIngredientUpdated(ingredientId: string, name: string): void {
    logAction({
        actionType: 'update',
        entityType: 'ingredient',
        entityId: ingredientId,
        entityName: name,
        description: `Ingrediente "${name}" atualizado`
    });
}

/**
 * Log ingredient deleted
 */
export function logIngredientDeleted(ingredientId: string, name: string): void {
    logAction({
        actionType: 'delete',
        entityType: 'ingredient',
        entityId: ingredientId,
        entityName: name,
        description: `Ingrediente "${name}" excluído do estoque`
    });
}

/**
 * Log stock movement (purchase/adjustment/waste)
 */
export function logStockMovement(ingredientId: string, name: string, type: 'purchase' | 'adjustment' | 'waste', quantity: number, unit: string, previousStock: number, newStock: number): void {
    const typeLabels: Record<string, string> = { purchase: 'Entrada', adjustment: 'Ajuste', waste: 'Saída' };
    const typeLabel = typeLabels[type] || type;
    logAction({
        actionType: 'stock_movement',
        entityType: 'ingredient',
        entityId: ingredientId,
        entityName: name,
        description: `${typeLabel} de ${Math.abs(quantity)} ${unit} em "${name}" (${previousStock} ${unit} → ${newStock} ${unit})`,
        metadata: { movement_type: type, quantity, unit, previous_stock: previousStock, new_stock: newStock }
    });
}

/**
 * Get action type label in Portuguese
 */
export function getActionTypeLabel(actionType: ActionType): string {
    const labels: Record<ActionType, string> = {
        create: 'Criação',
        update: 'Atualização',
        delete: 'Exclusão',
        view: 'Visualização',
        login: 'Login',
        logout: 'Logout',
        print: 'Impressão',
        export: 'Exportação',
        status_change: 'Mudança de Status',
        payment: 'Pagamento',
        refund: 'Reembolso',
        points_earned: 'Pontos Ganhos',
        points_redeemed: 'Pontos Resgatados',
        stock_movement: 'Movimentação de Estoque'
    };
    return labels[actionType] || actionType;
}

/**
 * Get entity type label in Portuguese
 */
export function getEntityTypeLabel(entityType: EntityType): string {
    const labels: Record<EntityType, string> = {
        order: 'Pedido',
        product: 'Produto',
        category: 'Categoria',
        customer: 'Cliente',
        coupon: 'Cupom',
        ingredient: 'Ingrediente',
        reward: 'Recompensa',
        addon: 'Adicional',
        settings: 'Configurações',
        report: 'Relatório',
        user: 'Usuário'
    };
    return labels[entityType] || entityType;
}

/**
 * Get action icon
 */
export function getActionIcon(actionType: ActionType): string {
    const icons: Record<ActionType, string> = {
        create: '➕',
        update: '✏️',
        delete: '🗑️',
        view: '👁️',
        login: '🔑',
        logout: '🚪',
        print: '🖨️',
        export: '📤',
        status_change: '🔄',
        payment: '💰',
        refund: '↩️',
        points_earned: '⭐',
        points_redeemed: '🎁',
        stock_movement: '📦'
    };
    return icons[actionType] || '📋';
}
