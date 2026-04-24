'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import Card from '@/components/ui/Card';
import { FiUsers, FiTrendingUp, FiShoppingBag, FiClock, FiTarget, FiArrowRight } from 'react-icons/fi';

interface FunnelStage {
    name: string;
    value: number;
    color: string;
}

interface ConversionFunnelProps {
    stages: Array<{
        stage: string;
        count: number;
        conversion_rate?: number;
    }>;
}

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

export function ConversionFunnel({ stages }: ConversionFunnelProps) {
    if (!stages || stages.length === 0) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiTarget className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Funil de Conversão</h3>
                </div>
                <div className="text-center text-text-muted py-8">
                    <p>Dados não disponíveis</p>
                </div>
            </Card>
        );
    }

    const maxValue = Math.max(...stages.map(s => s.count));
    
    const chartData = stages.map((s, idx) => ({
        name: s.stage,
        value: s.count,
        rate: s.count > 0 && maxValue > 0 ? (s.count / maxValue) * 100 : 0,
        color: COLORS[idx % COLORS.length]
    }));

    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <FiTarget className="text-primary" />
                <h3 className="font-semibold text-text-primary">Funil de Conversão</h3>
            </div>

            <div className="space-y-2">
                {chartData.map((stage, idx) => (
                    <div key={stage.name} className="relative">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: stage.color }} 
                                />
                                <span className="text-text-primary">{stage.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{stage.value}</span>
                                {idx > 0 && chartData[idx - 1].value > 0 && (
                                    <span className="text-xs text-text-muted">
                                        ({((stage.value / chartData[idx - 1].value) * 100).toFixed(0)}%)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                            <div 
                                className="h-full rounded-r-lg transition-all duration-300 opacity-20"
                                style={{ 
                                    width: `${stage.rate}%`, 
                                    backgroundColor: stage.color 
                                }} 
                            />
                        </div>
                    </div>
                ))}
            </div>

            {stages.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Conversão Final</span>
                        <span className="font-semibold text-primary">
                            {stages[0].count > 0 
                                ? ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)
                                : 0}%
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
}