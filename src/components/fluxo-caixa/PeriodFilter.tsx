'use client';

import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import { cn } from '@/utils/utils';

interface PeriodFilterProps {
    period: 'week' | 'month' | 'year';
    dateFrom: string;
    dateTo: string;
    onPeriodChange: (period: 'week' | 'month' | 'year') => void;
    onDateFromChange: (date: string) => void;
    onDateToChange: (date: string) => void;
}

export default function PeriodFilter({
    period,
    dateFrom,
    dateTo,
    onPeriodChange,
    onDateFromChange,
    onDateToChange
}: PeriodFilterProps) {
    const periods = [
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
        { value: 'year', label: 'Ano' }
    ] as const;

    return (
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap max-md:flex-col max-md:items-stretch">
            <div className="flex gap-2">
                {periods.map(p => (
                    <button
                        key={p.value}
                        className={cn(
                            'px-5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:border-primary',
                            period === p.value && 'bg-primary border-primary text-white'
                        )}
                        onClick={() => onPeriodChange(p.value)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-3 text-text-muted max-md:flex-wrap">
                <FiCalendar />
                <input
                    type="date"
                    className="px-3.5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                />
                <span>até</span>
                <input
                    type="date"
                    className="px-3.5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                />
            </div>
        </div>
    );
}
