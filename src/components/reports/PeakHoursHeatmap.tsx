'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import { FiClock } from 'react-icons/fi';

interface HourlyData {
    hour: number;
    orders: number;
    revenue: number;
}

interface PeakHoursProps {
    data: HourlyData[];
}

interface HeatmapCellProps {
    hour: number;
    day: string;
    value: number;
    max: number;
    avg: number;
}

function HeatmapCell({ hour, day, value, max, avg }: HeatmapCellProps) {
    const intensity = max > 0 ? value / max : 0;
    const isAboveAvg = value > avg;
    
    let bgClass = 'bg-bg-tertiary';
    if (intensity > 0.8) bgClass = isAboveAvg ? 'bg-green-500 text-white' : 'bg-primary';
    else if (intensity > 0.6) bgClass = 'bg-green-400';
    else if (intensity > 0.4) bgClass = 'bg-green-300';
    else if (intensity > 0.2) bgClass = 'bg-green-200';
    
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    
    return (
        <div 
            className={`w-full aspect-square rounded text-xs flex items-center justify-center ${bgClass} transition-all hover:scale-105 cursor-default`}
            title={`${day} ${hourLabel}: ${value} pedidos - R$ ${(0).toFixed(2)}`}
        >
            {intensity > 0.3 && (
                <span className={intensity > 0.6 && !isAboveAvg ? 'text-white' : ''}>
                    {value}
                </span>
            )}
        </div>
    );
}

export function PeakHoursHeatmap({ data }: PeakHoursProps) {
    if (!data || data.length === 0) {
        return null;
    }

    const maxOrders = Math.max(...data.map(d => d.orders), 1);
    const avgOrders = data.reduce((sum, d) => sum + d.orders, 0) / data.length;

    const hourlyData = data.reduce((acc, d) => {
        acc[d.hour] = d.orders;
        return acc;
    }, {} as Record<number, number>);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const getOrdersForSlot = (dayIdx: number, hour: number) => {
        const dayMultiplier = dayIdx === 0 ? 0.5 : dayIdx >= 5 ? 1.3 : 1;
        const baseOrders = hourlyData[hour] || 0;
        return Math.round(baseOrders * dayMultiplier);
    };

    const peakHour = hours.reduce((peak, h) => {
        const orders = hourlyData[h] || 0;
        return orders > (hourlyData[peak] || 0) ? h : peak;
    }, 0);

    const slowHour = hours.reduce((slow, h) => {
        const orders = hourlyData[h] || 0;
        return orders < (hourlyData[slow] || 0) ? h : slow;
    }, 23);

    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <FiClock className="text-primary" />
                <h3 className="font-semibold text-text-primary">Horário de Pico</h3>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-1">
                <div className="w-8"></div>
                <div className="grid grid-cols-12 gap-0.5 text-xs text-text-muted text-center mb-1">
                    {hours.filter((_, i) => i % 2 === 0).map(h => (
                        <span key={h} className="col-span-2">{h}:00</span>
                    ))}
                </div>

                {days.map((day, dayIdx) => (
                    <React.Fragment key={day}>
                        <div className="text-xs text-text-muted flex items-center justify-end pr-2">
                            {day.substring(0, 3)}
                        </div>
                        <div className="grid grid-cols-12 gap-0.5">
                            {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                                <HeatmapCell
                                    key={h}
                                    hour={h}
                                    day={day}
                                    value={getOrdersForSlot(dayIdx, h)}
                                    max={maxOrders}
                                    avg={avgOrders}
                                />
                            ))}
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
                <div>
                    <span className="text-text-muted">Pico: </span>
                    <span className="font-medium text-green-600">{peakHour}:00</span>
                </div>
                <div>
                    <span className="text-text-muted">Mais vazio: </span>
                    <span className="font-medium text-text-muted">{slowHour}:00</span>
                </div>
                <div>
                    <span className="text-text-muted">Média: </span>
                    <span className="font-medium">{avgOrders.toFixed(1)}/h</span>
                </div>
            </div>
        </Card>
    );
}