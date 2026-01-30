'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    loading?: boolean;
}

export default function StatsCard({
    title,
    value,
    change,
    changeLabel = 'vs mês anterior',
    icon,
    variant = 'default',
    loading = false,
}: StatsCardProps) {
    const variantStyles = {
        default: 'from-gray-800 to-gray-900 border-gray-700',
        success: 'from-emerald-900/50 to-gray-900 border-emerald-700/50',
        warning: 'from-amber-900/50 to-gray-900 border-amber-700/50',
        danger: 'from-red-900/50 to-gray-900 border-red-700/50',
    };

    const getTrendIcon = () => {
        if (change === undefined || change === 0) return <FiMinus className="text-gray-400" />;
        if (change > 0) return <FiTrendingUp className="text-emerald-400" />;
        return <FiTrendingDown className="text-red-400" />;
    };

    const getTrendColor = () => {
        if (change === undefined || change === 0) return 'text-gray-400';
        if (change > 0) return 'text-emerald-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className={cn(
                "bg-linear-to-br border rounded-xl p-6",
                variantStyles[variant]
            )}>
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                    <div className="h-8 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/3" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-linear-to-br border rounded-xl p-6 transition-all duration-300",
            "hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]",
            variantStyles[variant]
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-white">{value}</p>
                </div>
                {icon && (
                    <div className="w-12 h-12 rounded-lg bg-gray-800/50 flex items-center justify-center text-orange-400">
                        {icon}
                    </div>
                )}
            </div>

            {change !== undefined && (
                <div className="mt-4 flex items-center gap-2">
                    {getTrendIcon()}
                    <span className={cn("text-sm font-medium", getTrendColor())}>
                        {change > 0 ? '+' : ''}{change}%
                    </span>
                    <span className="text-gray-500 text-xs">{changeLabel}</span>
                </div>
            )}
        </div>
    );
}
