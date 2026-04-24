'use client';

import React, { useMemo } from 'react';
import {
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import { FiTrendingUp, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import Card from '@/components/ui/Card';



interface ABCAnalysisProps {
    products: Array<{
        name: string;
        revenue: number;
        quantity: number;
    }>;
}

const COLORS = {
    A: '#22c55e',
    B: '#eab308', 
    C: '#ef4444'
};

export function ABCAnalysis({ products }: ABCAnalysisProps) {
    const totalRevenue = useMemo(() => 
        (products || []).reduce((sum, p) => sum + p.revenue, 0),
        [products]
    );

    const sorted = useMemo(() => 
        [... (products || [])].sort((a, b) => b.revenue - a.revenue),
        [products]
    );
    
    const classified = useMemo(() => {
        interface Acc {
            items: Array<ABCAnalysisProps['products'][number] & { category: 'A' | 'B' | 'C'; pct: number; cumulativeQty: number }>;
            cumulativeRevenue: number;
            cumulativeQty: number;
        }

        return sorted.reduce((acc: Acc, p) => {
            const newCumRevenue = acc.cumulativeRevenue + p.revenue;
            const newCumQty = acc.cumulativeQty + p.quantity;
            const pct = totalRevenue > 0 ? (newCumRevenue / totalRevenue) * 100 : 0;
            
            let category: 'A' | 'B' | 'C' = 'C';
            if (pct <= 80) category = 'A';
            else if (pct <= 95) category = 'B';
            
            acc.items.push({
                ...p,
                category,
                pct,
                cumulativeQty: newCumQty
            });

            return {
                items: acc.items,
                cumulativeRevenue: newCumRevenue,
                cumulativeQty: newCumQty
            };
        }, { items: [], cumulativeRevenue: 0, cumulativeQty: 0 }).items;
    }, [sorted, totalRevenue]);

    const stats = useMemo(() => {
        const a = classified.filter(p => p.category === 'A');
        const b = classified.filter(p => p.category === 'B');
        const c = classified.filter(p => p.category === 'C');

        return {
            aProducts: a,
            bProducts: b,
            cProducts: c,
            aRevenue: a.reduce((sum, p) => sum + p.revenue, 0),
            bRevenue: b.reduce((sum, p) => sum + p.revenue, 0),
            cRevenue: c.reduce((sum, p) => sum + p.revenue, 0)
        };
    }, [classified]);

    if (!products || products.length === 0) {
        return null;
    }

    const { aProducts, bProducts, cProducts, aRevenue, bRevenue, cRevenue } = stats;

    const pieData = [
        { name: 'A (80%)', value: aRevenue, count: aProducts.length, color: COLORS.A },
        { name: 'B (15%)', value: bRevenue, count: bProducts.length, color: COLORS.B },
        { name: 'C (5%)', value: cRevenue, count: cProducts.length, color: COLORS.C }
    ].filter(d => d.value > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiPackage className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Análise ABC de Produtos</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-linear-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-4 text-center transition-all hover:shadow-sm">
                        <div className="text-3xl font-black text-green-600 mb-1">{aProducts.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-700 opacity-70 mb-1">Tipo A</div>
                        <div className="text-sm font-semibold text-green-600">{totalRevenue > 0 ? Math.round((aRevenue / totalRevenue) * 100) : 0}% receita</div>
                    </div>
                    <div className="bg-linear-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4 text-center transition-all hover:shadow-sm">
                        <div className="text-3xl font-black text-amber-600 mb-1">{bProducts.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 opacity-70 mb-1">Tipo B</div>
                        <div className="text-sm font-semibold text-amber-600">{totalRevenue > 0 ? Math.round((bRevenue / totalRevenue) * 100) : 0}% receita</div>
                    </div>
                    <div className="bg-linear-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-xl p-4 text-center transition-all hover:shadow-sm">
                        <div className="text-3xl font-black text-rose-600 mb-1">{cProducts.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 opacity-70 mb-1">Tipo C</div>
                        <div className="text-sm font-semibold text-rose-600">{totalRevenue > 0 ? Math.round((cRevenue / totalRevenue) * 100) : 0}% receita</div>
                    </div>
                </div>

                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Lista de Produtos por Tipo</h3>
                </div>
                
                {/* Tipo A - Os mais vendidos */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-4 h-4 rounded bg-green-500"></span>
                        <span className="text-sm font-medium text-green-600">Tipo A (80% da receita - manter sempre)</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {aProducts.slice(0, 5).map((product, idx) => (
                            <div key={'a'+idx} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                                <span className="text-text-primary truncate max-w-[120px]">{product.name}</span>
                                <span className="text-green-600 font-medium">R$ {product.revenue.toFixed(0)}</span>
                            </div>
                        ))}
                        {aProducts.length === 0 && <p className="text-text-muted text-xs">Nenhum produto tipo A</p>}
                    </div>
                </div>

                {/* Tipo B */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-4 h-4 rounded bg-yellow-500"></span>
                        <span className="text-sm font-medium text-yellow-600">Tipo B (15% da receita - promover)</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bProducts.slice(0, 3).map((product, idx) => (
                            <div key={'b'+idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded text-sm">
                                <span className="text-text-primary truncate max-w-[120px]">{product.name}</span>
                                <span className="text-yellow-600 font-medium">R$ {product.revenue.toFixed(0)}</span>
                            </div>
                        ))}
                        {bProducts.length === 0 && <p className="text-text-muted text-xs">Nenhum produto tipo B</p>}
                    </div>
                </div>

                {/* Tipo C - Avaliar descontinuar */}
                <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <FiAlertTriangle size={16} />
                        <span className="text-sm font-medium">Tipo C (5% - avaliar descontinuação)</span>
                    </div>
                    <div className="space-y-1">
                        {cProducts.slice(0, 5).map((product, idx) => (
                            <div key={'c'+idx} className="flex items-center justify-between p-2 text-sm">
                                <span className="text-red-600 truncate max-w-[120px]">{product.name}</span>
                                <span className="text-red-600 font-medium">R$ {product.revenue.toFixed(0)}</span>
                            </div>
                        ))}
                        {cProducts.length > 5 && (
                            <div className="text-xs text-red-600 text-center">+ {cProducts.length - 5} mais</div>
                        )}
                        {cProducts.length === 0 && <p className="text-red-600 text-xs">Nenhum produto tipo C</p>}
                    </div>
                </div>
            </Card>
        </div>
    );
}