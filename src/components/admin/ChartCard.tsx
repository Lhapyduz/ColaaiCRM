'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FiCalendar, FiMoreVertical } from 'react-icons/fi';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    period?: string;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
    loading?: boolean;
}

export default function ChartCard({
    title,
    subtitle,
    period,
    children,
    actions,
    className,
    loading = false,
}: ChartCardProps) {
    if (loading) {
        return (
            <div className={cn(
                "bg-linear-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6",
                className
            )}>
                <div className="animate-pulse space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-5 bg-gray-700 rounded w-1/3" />
                        <div className="h-4 bg-gray-700 rounded w-1/4" />
                    </div>
                    <div className="h-64 bg-gray-700/50 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-linear-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl overflow-hidden",
            className
        )}>
            {/* Header */}
            <div className="p-6 pb-0">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-white font-semibold text-lg">{title}</h3>
                        {subtitle && (
                            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {period && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-gray-400 text-sm">
                                <FiCalendar size={14} />
                                <span>{period}</span>
                            </div>
                        )}
                        {actions || (
                            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                                <FiMoreVertical size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Content */}
            <div className="p-6 pt-4 min-h-px min-w-px">
                {children}
            </div>
        </div>
    );
}
