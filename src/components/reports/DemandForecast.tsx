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
    AreaChart,
    Area
} from 'recharts';
import Card from '@/components/ui/Card';
import { FiTrendingUp, FiCalendar, FiShoppingBag, FiTruck } from 'react-icons/fi';
import { useDailyAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/hooks/useFormatters';

interface DemandForecastProps {
    userId: string;
    days?: number;
}

interface ForecastPoint {
    day: string;
    actual?: number;
    forecast: number;
    upper: number;
    lower: number;
}

export function DemandForecast({ userId, days = 7 }: DemandForecastProps) {
    const { data, loading, totals } = useDailyAnalytics(userId, days * 2);

    if (loading || !data || data.length === 0) {
        return (
            <Card className="p-4">
                <div className="animate-pulse h-56 bg-bg-tertiary rounded-lg" />
            </Card>
        );
    }

    // Calculate simple forecast based on moving average
    const recentDays = data.slice(0, 7);
    const avgOrders = recentDays.reduce((sum, d) => sum + (d.total_orders || 0), 0) / Math.max(recentDays.length, 1);
    const avgRevenue = recentDays.reduce((sum, d) => sum + (d.total_revenue || 0), 0) / Math.max(recentDays.length, 1);
    
    // Calculate trend (simple linear regression slope)
    const n = recentDays.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = recentDays.reduce((sum, d, i) => sum + (d.total_orders || 0), 0);
    const sumXY = recentDays.reduce((sum, d, i) => sum + i * (d.total_orders || 0), 0);
    const sumX2 = recentDays.reduce((sum, _, i) => sum + i * i, 0);
    
    const trend = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const forecastFactor = 1 + (trend / avgOrders) * 0.5;

    // Generate forecast data
    const forecastData: ForecastPoint[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayIndex = date.getDay();
        
        const forecastOrders = Math.round(avgOrders * forecastFactor * (0.8 + Math.random() * 0.4));
        const variation = 0.15;
        
        forecastData.push({
            day: dayNames[dayIndex] + ' ' + (i + 1),
            actual: i < recentDays.length ? recentDays[i]?.total_orders : undefined,
            forecast: forecastOrders,
            upper: Math.round(forecastOrders * (1 + variation)),
            lower: Math.round(forecastOrders * (1 - variation))
        });
    }

    // Calculate predicted totals
    const predictedOrders = forecastData.reduce((sum, d) => sum + d.forecast, 0);
    const predictedRevenue = predictedOrders * (avgRevenue / Math.max(avgOrders, 1));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Previsão de Demandas</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-green-700">Pedidos Previstos</div>
                        <div className="text-xl font-bold text-green-600">{predictedOrders}</div>
                        <div className="text-xs text-green-600">próximos {days} dias</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-blue-700">Receita Prevista</div>
                        <div className="text-xl font-bold text-blue-600">{formatCurrency(predictedRevenue)}</div>
                        <div className="text-xs text-blue-600">próx {days} dias</div>
                    </div>
                </div>

                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData}>
                            <defs>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="day" stroke="#888" fontSize={10} />
                            <YAxis stroke="#888" fontSize={12} />
                            <Tooltip
                                formatter={(value: number) => [value, '']}
                                contentStyle={{
                                    background: 'rgba(45,52,54,0.95)',
                                    border: 'none',
                                    borderRadius: '8px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="upper"
                                stroke="transparent"
                                fill="#ff6b35"
                                fillOpacity={0.1}
                                name="Upper"
                            />
                            <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="#ff6b35"
                                strokeWidth={2}
                                fill="url(#colorForecast)"
                                name="Previsto"
                            />
                            <Area
                                type="monotone"
                                dataKey="lower"
                                stroke="transparent"
                                fill="#ffffff"
                                fillOpacity={0.1}
                                name="Lower"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiCalendar className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Tendência</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <div className="flex items-center gap-2">
                            <FiShoppingBag className="text-primary" />
                            <span className="text-text-primary">Média Diária</span>
                        </div>
                        <div className="font-semibold text-text-primary">
                            {avgOrders.toFixed(1)} pedidos
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <div className="flex items-center gap-2">
                            <FiTrendingUp className={trend >= 0 ? 'text-green-600' : 'text-red-600'} />
                            <span className="text-text-primary">Tendência</span>
                        </div>
                        <div className={`font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? '+' : ''}{(trend * 100).toFixed(1)}%/dia
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <div className="flex items-center gap-2">
                            <FiTruck className="text-primary" />
                            <span className="text-text-primary">Ticket Médio</span>
                        </div>
                        <div className="font-semibold text-text-primary">
                            {formatCurrency(avgOrders > 0 ? avgRevenue / avgOrders : 0)}
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-primary/10 text-center">
                    <div className="text-xs text-primary mb-1">Próxima Semana</div>
                    <div className="text-2xl font-bold text-primary">
                        {formatCurrency(predictedRevenue)}
                    </div>
                    <div className="text-xs text-text-muted">receita prevista</div>
                </div>
            </Card>
        </div>
    );
}