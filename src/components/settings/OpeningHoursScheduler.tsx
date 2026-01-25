import React from 'react';
import { FiClock, FiPlus, FiTrash2 } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { OpeningHourInput } from '@/app/actions/store';

interface OpeningHoursSchedulerProps {
    hours: OpeningHourInput[];
    onChange: (index: number, field: keyof OpeningHourInput, value: any) => void;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function OpeningHoursScheduler({ hours, onChange }: OpeningHoursSchedulerProps) {
    return (
        <div className="flex flex-col gap-3">
            {hours.map((hour, index) => (
                <div
                    key={index}
                    className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 flex-wrap gap-y-3",
                        hour.is_closed
                            ? "bg-bg-tertiary/50 border-white/5 opacity-70"
                            : "bg-bg-tertiary border-border hover:border-border-light"
                    )}
                >
                    <div className="flex items-center gap-4 flex-1 min-w-[140px]">
                        <div className="w-24 font-medium text-text-primary">
                            {WEEKDAYS[hour.day_of_week]}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className={cn(
                                "w-10 h-6 rounded-full transition-colors relative",
                                hour.is_closed ? "bg-bg-card border border-white/10" : "bg-primary"
                            )}>
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                                    hour.is_closed ? "left-1" : "translate-x-5"
                                )} />
                            </div>
                            <input
                                type="checkbox"
                                checked={!hour.is_closed}
                                onChange={(e) => onChange(index, 'is_closed', !e.target.checked)}
                                className="hidden"
                            />
                            <span className={cn(
                                "text-sm",
                                hour.is_closed ? "text-text-muted" : "text-primary font-medium"
                            )}>
                                {hour.is_closed ? 'Fechado' : 'Aberto'}
                            </span>
                        </label>
                    </div>

                    {!hour.is_closed && (
                        <div className="flex items-center gap-2 animate-fadeIn">
                            <div className="flex items-center bg-bg-card rounded-lg border border-white/5 px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                                <FiClock className="text-text-secondary mr-2" size={14} />
                                <input
                                    type="time"
                                    value={hour.open_time?.slice(0, 5) || ''}
                                    onChange={(e) => onChange(index, 'open_time', e.target.value)}
                                    className="bg-transparent border-none text-text-primary text-sm focus:outline-none w-[60px]"
                                />
                            </div>
                            <span className="text-text-secondary text-sm">até</span>
                            <div className="flex items-center bg-bg-card rounded-lg border border-white/5 px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                                <FiClock className="text-text-secondary mr-2" size={14} />
                                <input
                                    type="time"
                                    value={hour.close_time?.slice(0, 5) || ''}
                                    onChange={(e) => onChange(index, 'close_time', e.target.value)}
                                    className="bg-transparent border-none text-text-primary text-sm focus:outline-none w-[60px]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
