'use client';

import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/hooks/useFormatters';

interface TopCategoriesCardProps {
    type: 'income' | 'expense';
    data: [string, number][];
}

export default function TopCategoriesCard({ type, data }: TopCategoriesCardProps) {
    const title = type === 'income' ? 'Top Entradas' : 'Top Saídas';
    const Icon = type === 'income' ? FiTrendingUp : FiTrendingDown;

    return (
        <Card className="p-4! flex-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 text-text-secondary">
                <Icon /> {title}
            </h3>
            <div className="flex flex-col gap-2">
                {data.map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                        <span>{category}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                ))}
                {data.length === 0 && (
                    <p className="text-text-muted text-sm text-center py-4">Sem dados</p>
                )}
            </div>
        </Card>
    );
}
