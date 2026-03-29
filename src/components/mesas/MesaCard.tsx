import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Users, ReceiptText, MapPin, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { MesaWithActiveSession } from '@/lib/services/mesas';

interface MesaCardProps {
    mesa: MesaWithActiveSession;
    onClick: (mesa: MesaWithActiveSession) => void;
    index: number;
    isSelected?: boolean;
    isConfiguring?: boolean;
}

export function MesaCard({ mesa, onClick, index, isSelected, isConfiguring }: MesaCardProps) {
    const { formatCurrency } = useFormatters();

    const session = mesa.active_session;
    const status = session?.status || 'livre';
    const openedAt = session?.opened_at;

    // Para forçar re-render a cada 1 min e atualizar o tempo
    const [now, setNow] = useState<number | null>(null);

    // Setup inicial seguro de hydration
    useEffect(() => {
        const t = setTimeout(() => setNow(Date.now()), 0);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (status !== 'livre' && status !== 'suja' && openedAt) {
            interval = setInterval(() => setNow(Date.now()), 60000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, openedAt]);

    const elapsedTime = useMemo(() => {
        if (now !== null && status !== 'livre' && status !== 'suja' && openedAt) {
            const start = new Date(openedAt).getTime();
            const diff = Math.max(0, now - start); // evita negativos
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        return '';
    }, [status, openedAt, now]);

    // Definição de estilos baseada no status
    const getStatusConfig = () => {
        switch (status) {
            case 'livre':
                return {
                    bg: 'bg-bg-card',
                    border: 'border-border',
                    borderHover: 'hover:border-emerald-500/50',
                    headerBg: 'bg-bg-tertiary',
                    badgeBg: 'bg-emerald-500/10',
                    badgeText: 'text-emerald-500',
                    label: 'Livre',
                    pulse: false
                };
            case 'ocupada':
                return {
                    bg: 'bg-bg-card',
                    border: 'border-red-500/30',
                    borderHover: 'hover:border-red-500',
                    headerBg: 'bg-red-500/5',
                    badgeBg: 'bg-red-500/10',
                    badgeText: 'text-red-500',
                    label: 'Ocupada',
                    pulse: true
                };
            case 'fechando':
                return {
                    bg: 'bg-bg-card',
                    border: 'border-amber-500/30',
                    borderHover: 'hover:border-amber-500',
                    headerBg: 'bg-amber-500/5',
                    badgeBg: 'bg-amber-500/10',
                    badgeText: 'text-amber-500',
                    label: 'Pedindo Conta',
                    pulse: true
                };
            case 'suja':
                return {
                    bg: 'bg-bg-card',
                    border: 'border-blue-500/30',
                    borderHover: 'hover:border-blue-500',
                    headerBg: 'bg-blue-500/5',
                    badgeBg: 'bg-blue-500/10',
                    badgeText: 'text-blue-500',
                    label: 'Em Limpeza',
                    pulse: false
                };
            default:
                return {
                    bg: 'bg-bg-card',
                    border: 'border-border',
                    borderHover: 'hover:border-primary/50',
                    headerBg: 'bg-bg-tertiary',
                    badgeBg: 'bg-text-muted/10',
                    badgeText: 'text-text-muted',
                    label: status,
                    pulse: false
                };
        }
    };

    const config = getStatusConfig();
    const hasItems = session?.items && session.items.length > 0;

    return (
        <div
            onClick={() => onClick(mesa)}
            className={cn(
                "group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 shadow-sm hover:shadow-xl",
                config.bg,
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-bg-primary" : config.border,
                !isSelected && config.borderHover,
                "animate-slideUpAndFade"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Efeito de pulse sutil para mesas que demandam atenção */}
            {config.pulse && (
                <div className={cn(
                    "absolute -right-1 -top-1 w-3 h-3 rounded-full animate-ping z-10",
                    status === 'fechando' ? 'bg-amber-500' : 'bg-red-500'
                )} />
            )}

            {/* Header do Card */}
            <div className={cn("p-3 md:p-4 border-b border-border transition-colors", config.headerBg)}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Mesa</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl md:text-3xl font-black leading-none text-text-primary">
                                {String(mesa.numero_mesa).padStart(2, '0')}
                            </span>
                            {isConfiguring && (
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary text-xs font-bold bg-primary/20 px-2 py-0.5 rounded ml-1">EDITAR</span>
                            )}
                        </div>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent group-hover:border-current/20 transition-colors", config.badgeBg, config.badgeText)}>
                        {config.label}
                    </span>
                </div>
            </div>

            {/* Body do Card */}
            <div className="p-3 md:p-4 flex-1 flex flex-col gap-3 md:gap-4">
                {status === 'livre' ? (
                    // Estado LIVRE
                    <div className="flex-1 flex flex-col items-center justify-center py-3 md:py-6 text-text-muted opacity-60 group-hover:opacity-100 transition-opacity">
                        <CheckCircle className="w-6 h-6 md:w-8 md:h-8 mb-1 md:mb-2" />
                        <span className="text-[10px] md:text-xs font-medium">Mesa livre</span>
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
                            <Users size={12} /> Máx {mesa.capacidade}
                        </div>
                    </div>
                ) : status === 'suja' ? (
                    // Estado SUJA
                    <div className="flex-1 flex flex-col items-center justify-center py-6 text-blue-500 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase">Aguardando Limpeza</span>
                    </div>
                ) : (
                    // Estado OCUPADA / FECHANDO
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-text-muted font-semibold uppercase flex items-center gap-1">
                                    <Users size={10} /> Capacidade
                                </span>
                                <span className="text-sm font-bold text-text-primary">{mesa.capacidade}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-text-muted font-semibold uppercase flex items-center gap-1">
                                    <Clock size={10} /> Tempo
                                </span>
                                <span className="text-sm font-bold text-text-primary">{elapsedTime || '00:00'}</span>
                            </div>
                        </div>

                        {session?.garcom && (
                            <div className="flex flex-col gap-1 pt-2 border-t border-border/50">
                                <span className="text-[10px] text-text-muted font-semibold uppercase flex items-center gap-1">
                                    <MapPin size={10} /> Atendimento
                                </span>
                                <span className="text-xs font-medium text-text-secondary truncate">{session.garcom}</span>
                            </div>
                        )}

                        <div className="mt-auto pt-2 md:pt-4 flex items-end justify-between border-t border-border">
                            <div className="flex flex-col">
                                <span className="text-[9px] md:text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Total</span>
                                <span className={cn(
                                    "text-base md:text-xl font-black transition-colors",
                                    status === 'fechando' ? 'text-amber-500' : 'text-primary'
                                )}>
                                    {formatCurrency(session?.valor_parcial || 0)}
                                </span>
                            </div>
                            {hasItems && (
                                <div className="flex items-center justify-center size-8 rounded-full bg-bg-tertiary text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors" title="Itens na mesa">
                                    <ReceiptText size={14} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
