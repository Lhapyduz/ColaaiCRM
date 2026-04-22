'use client';

import React from 'react';
import { FiShoppingBag } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/hooks/useFormatters';

interface CategoryRevenue {
    name: string;
    total: number;
    count: number;
}

interface CategoryRevenueCardProps {
    categories: CategoryRevenue[];
}

export default function CategoryRevenueCard({ categories }: CategoryRevenueCardProps) {
    if (categories.length === 0) return null;

    return (
        <Card className="p-4! flex-1 border-primary/20 bg-primary/5">
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 text-primary">
                <FiShoppingBag /> Receita por Categoria
            </h3>
            <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                    <div key={cat.name} className="flex justify-between text-sm items-center">
                        <div className="flex flex-col">
                            <span>{cat.name}</span>
                            <span className="text-[10px] text-text-muted">
                                {cat.count} {cat.count === 1 ? 'venda' : 'vendas'}
                            </span>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(cat.total)}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
