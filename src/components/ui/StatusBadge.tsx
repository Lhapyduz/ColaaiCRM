'use client';

import React from 'react';
import { cn } from '@/lib/utils';


// Status types for orders
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid';
export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type CouponStatus = 'active' | 'expired' | 'limit_reached' | 'inactive';

type StatusType = OrderStatus | PaymentStatus | BillStatus | CouponStatus | string;

interface StatusConfig {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon?: string;
}

// Configuração de todos os status
const STATUS_CONFIG: Record<string, StatusConfig> = {
    // Order Status
    pending: {
        label: 'Aguardando',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        icon: '⏳',
    },
    preparing: {
        label: 'Preparando',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: '👨‍🍳',
    },
    ready: {
        label: 'Pronto',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '✅',
    },
    delivering: {
        label: 'Entregando',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: '🛵',
    },
    delivered: {
        label: 'Entregue',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        icon: '🎉',
    },
    cancelled: {
        label: 'Cancelado',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: '❌',
    },
    // Payment Status
    paid: {
        label: 'Pago',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '💰',
    },
    // Bill Status
    overdue: {
        label: 'Vencido',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: '⚠️',
    },
    // Coupon Status
    active: {
        label: 'Ativo',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '✓',
    },
    expired: {
        label: 'Expirado',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        icon: '⏰',
    },
    limit_reached: {
        label: 'Limite atingido',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: '🚫',
    },
    inactive: {
        label: 'Inativo',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        icon: '○',
    },
};

// Fallback for unknown status
const DEFAULT_STATUS: StatusConfig = {
    label: 'Desconhecido',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
};

interface StatusBadgeProps {
    status: StatusType;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showBorder?: boolean;
    customLabel?: string;
    className?: string;
    pulse?: boolean;
}

const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
};

const iconSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};

export function StatusBadge({
    status,
    size = 'sm',
    showIcon = true,
    showBorder = true,
    customLabel,
    className,
    pulse = false,
}: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || DEFAULT_STATUS;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap',
                sizeClasses[size],
                config.color,
                config.bgColor,
                showBorder && `border ${config.borderColor}`,
                pulse && 'animate-pulse',
                className
            )}
        >
            {showIcon && config.icon && (
                <span className={iconSizeClasses[size]}>{config.icon}</span>
            )}
            <span>{customLabel || config.label}</span>
        </span>
    );
}

// Helper function to get status config without using the component
export function getStatusConfig(status: StatusType): StatusConfig {
    return STATUS_CONFIG[status] || DEFAULT_STATUS;
}

// Helper function to get just the label
export function getStatusLabel(status: StatusType): string {
    return (STATUS_CONFIG[status] || DEFAULT_STATUS).label;
}

// Payment method badges
export type PaymentMethod = 'money' | 'pix' | 'credit' | 'debit';

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, StatusConfig> = {
    money: {
        label: 'Dinheiro',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '💵',
    },
    pix: {
        label: 'PIX',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
        icon: '📱',
    },
    credit: {
        label: 'Crédito',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        icon: '💳',
    },
    debit: {
        label: 'Débito',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: '💳',
    },
};

interface PaymentMethodBadgeProps {
    method: PaymentMethod;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

export function PaymentMethodBadge({
    method,
    size = 'sm',
    showIcon = true,
    className,
}: PaymentMethodBadgeProps) {
    const config = PAYMENT_METHOD_CONFIG[method] || {
        label: method,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 font-medium rounded-full border whitespace-nowrap',
                sizeClasses[size],
                config.color,
                config.bgColor,
                config.borderColor,
                className
            )}
        >
            {showIcon && config.icon && (
                <span className={iconSizeClasses[size]}>{config.icon}</span>
            )}
            <span>{config.label}</span>
        </span>
    );
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_CONFIG[method]?.label || method;
}

export default StatusBadge;
