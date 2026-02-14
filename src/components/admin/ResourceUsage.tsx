'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FiTrendingUp, FiAlertCircle, FiInfo } from 'react-icons/fi';

interface ResourceMetric {
    used: number;
    limit: number;
    label: string;
    unit: string;
}

interface ResourceUsageProps {
    data: {
        supabase: Record<string, ResourceMetric>;
        vercel: Record<string, ResourceMetric>;
    };
    loading?: boolean;
}

export function ResourceUsage({ data, loading }: ResourceUsageProps) {
    const formatValue = (value: number, unit: string) => {
        if (unit === 'MB') return `${(value / (1024 * 1024)).toFixed(2)} MB`;
        if (unit === 'GB') return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        if (unit === 'invocações' || unit === 'usuários') return value.toLocaleString('pt-BR');
        return value.toString();
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const calculateDaysRemaining = (used: number, limit: number) => {
        if (used === 0) return 'Indeterminado';
        const percentageUsed = (used / limit) * 100;
        if (percentageUsed < 1) return '> 365 dias';

        // Estimativa simplificada baseada no uso atual (Burn Rate Estimado)
        // Em um sistema real, usaríamos histórico, aqui faremos uma projeção conservadora
        const daysSinceStart = 30; // Assumindo ciclo mensal
        const dailyUsage = used / daysSinceStart;
        const remaining = limit - used;
        const daysLeft = Math.floor(remaining / dailyUsage);

        return daysLeft > 365 ? '> 1 ano' : `${daysLeft} dias`;
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-900/50 rounded-xl h-96 w-full" />;
    }

    const sections = [
        { title: 'Supabase (Banco de Dados & Auth)', metrics: data.supabase },
        { title: 'Vercel (Hosting & Serverless)', metrics: data.vercel }
    ];

    return (
        <div className="space-y-6">
            {sections.map((section, idx) => (
                <div key={idx} className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/20 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FiTrendingUp className="text-emerald-400" />
                            {section.title}
                        </h3>
                        <span className="text-xs text-gray-400 font-mono">Plano Gratuito / Hobby</span>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(section.metrics).map(([key, metric]) => {
                            const percentage = Math.min((metric.used / metric.limit) * 100, 100);
                            const isCritical = percentage > 85;

                            return (
                                <div key={key} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                                            <p className="text-lg font-bold text-white">
                                                {formatValue(metric.used, metric.unit)}
                                                <span className="text-gray-500 text-sm font-normal ml-1">
                                                    / {formatValue(metric.limit, metric.unit)}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                percentage > 90 ? "text-red-400" : percentage > 70 ? "text-amber-400" : "text-emerald-400"
                                            )}>
                                                {percentage.toFixed(1)}%
                                            </span>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Uso Total</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-1000", getProgressColor(percentage))}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <FiInfo size={12} />
                                            <span>Estimativa: {calculateDaysRemaining(metric.used, metric.limit)} restantes</span>
                                        </div>
                                        {isCritical && (
                                            <div className="flex items-center gap-1 text-xs text-red-400 font-medium">
                                                <FiAlertCircle size={12} />
                                                <span>Atingindo limite!</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Recommendation Box */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-4 items-start">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <FiTrendingUp size={20} />
                </div>
                <div>
                    <h4 className="text-emerald-400 font-bold text-sm mb-1">Status da Escala</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Seu sistema está operando bem dentro dos limites gratuitos.
                        Recomendamos o plano &apos;Pro&apos; do Supabase apenas quando o banco de dados ultrapassar 400MB ou houver mais de 50.000 usuários ativos.
                    </p>
                </div>
            </div>
        </div>
    );
}
