'use client';

import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiTrash2 } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/utils/utils';
import { CachedCashFlow } from '@/types/db';

interface TransactionListProps {
    loading: boolean;
    entries: CachedCashFlow[];
    onDelete: (id: string) => void;
}

export default function TransactionList({
    loading,
    entries,
    onDelete
}: TransactionListProps) {
    const formatDate = (date: string) => 
        new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

    return (
        <Card>
            <h2 className="text-base font-semibold mb-4">Movimentações</h2>
            {loading ? (
                <div className="p-8 text-center text-text-secondary">Carregando...</div>
            ) : entries.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    <p>Nenhuma movimentação registrada</p>
                    <small className="block mt-2 text-xs">
                        As movimentações são criadas automaticamente ao marcar contas como pagas
                    </small>
                </div>
            ) : (
                <div className="flex flex-col">
                    {entries.map(entry => (
                        <div key={entry.id} className="grid grid-cols-[40px_1fr_120px_120px_40px] items-center gap-4 py-3 border-b border-border last:border-b-0 max-md:grid-cols-[40px_1fr_80px_40px]">
                            <div className={cn(
                                'w-9 h-9 flex items-center justify-center rounded-full text-base',
                                entry.type === 'income' ? 'bg-[#27ae60]/10 text-[#27ae60]' : 'bg-error/10 text-error'
                            )}>
                                {entry.type === 'income' ? <FiTrendingUp /> : <FiTrendingDown />}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{entry.description}</span>
                                <span className="text-xs text-text-muted">{entry.category}</span>
                            </div>
                            <div className="flex flex-col items-end max-md:hidden">
                                <span className="text-[0.8125rem]">{formatDate(entry.transaction_date)}</span>
                                {entry.payment_method && (
                                    <span className="text-xs text-text-muted">{entry.payment_method}</span>
                                )}
                            </div>
                            <span className={cn(
                                'font-semibold text-right',
                                entry.type === 'income' ? 'text-[#27ae60]' : 'text-error'
                            )}>
                                {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                            </span>
                            <button
                                onClick={() => onDelete(entry.id)}
                                className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors flex items-center justify-center"
                                title="Excluir movimentação"
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
