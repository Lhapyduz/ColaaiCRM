'use client';

import React, { useState, useEffect } from 'react';
import { FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { BsCash } from 'react-icons/bs';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/hooks/useFormatters';

interface DaySummary {
    totalOrders: number;
    totalRevenue: number;
    paidOrders: number;
    pendingPayments: number;
    byMethod: { money: number; pix: number; credit: number; debit: number; };
}

export default function CaixaPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState<DaySummary>({
        totalOrders: 0, totalRevenue: 0, paidOrders: 0, pendingPayments: 0,
        byMethod: { money: 0, pix: 0, credit: 0, debit: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const toast = useToast();

    useEffect(() => { if (user) fetchSummary(); }, [user, selectedDate]);

    const fetchSummary = async () => {
        if (!user) return;
        try {
            const startDate = new Date(`${selectedDate}T00:00:00`);
            const endDate = new Date(`${selectedDate}T23:59:59.999`);
            const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()).neq('status', 'cancelled');
            if (orders) {
                const paidOrders = orders.filter(o => o.payment_status === 'paid');
                const pendingOrders = orders.filter(o => o.payment_status === 'pending');
                const byMethod = {
                    money: paidOrders.filter(o => o.payment_method === 'money').reduce((sum, o) => sum + o.total, 0),
                    pix: paidOrders.filter(o => o.payment_method === 'pix').reduce((sum, o) => sum + o.total, 0),
                    credit: paidOrders.filter(o => o.payment_method === 'credit').reduce((sum, o) => sum + o.total, 0),
                    debit: paidOrders.filter(o => o.payment_method === 'debit').reduce((sum, o) => sum + o.total, 0)
                };
                setSummary({ totalOrders: orders.length, totalRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0), paidOrders: paidOrders.length, pendingPayments: pendingOrders.reduce((sum, o) => sum + o.total, 0), byMethod });
            }
        } catch (error) { console.error('Error fetching summary:', error); toast.error('Erro ao carregar dados'); }
        finally { setLoading(false); }
    };

    const formatDateLong = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="max-w-[900px] mx-auto">
            <div className="flex items-start justify-between mb-4 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Caixa</h1>
                    <p className="text-text-secondary">Resumo financeiro do dia</p>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2.5 bg-bg-card border border-border rounded-md text-text-primary text-[0.9375rem] cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
            </div>

            <div className="text-lg text-text-secondary mb-6 capitalize">{isToday ? 'Hoje' : formatDateLong(selectedDate)}</div>

            {loading ? (
                <div className="flex flex-col gap-6">
                    <div className="h-[150px] rounded-2xl bg-bg-tertiary animate-pulse" />
                    <div className="grid grid-cols-4 gap-4 mb-8 max-md:grid-cols-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-[100px] rounded-xl bg-bg-tertiary animate-pulse" />)}</div>
                </div>
            ) : (
                <>
                    {/* Main Stats */}
                    <Card className="p-8! mb-8 bg-linear-to-br from-bg-card to-bg-tertiary">
                        <div className="text-center">
                            <span className="block text-[0.9375rem] text-text-secondary mb-2">Receita Total</span>
                            <span className="block text-5xl font-bold bg-linear-to-br from-primary to-accent bg-clip-text text-transparent mb-2 max-md:text-4xl">{formatCurrency(summary.totalRevenue)}</span>
                            <span className="text-sm text-text-muted">{summary.paidOrders} pedido{summary.paidOrders !== 1 ? 's' : ''} pago{summary.paidOrders !== 1 ? 's' : ''}</span>
                        </div>
                        {summary.pendingPayments > 0 && (
                            <div className="flex items-center gap-3 mt-6 p-4 bg-warning/10 border border-warning/30 rounded-md">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <span className="block text-[0.8125rem] text-warning mb-0.5">Pagamentos Pendentes</span>
                                    <span className="block text-lg font-semibold text-warning">{formatCurrency(summary.pendingPayments)}</span>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Payment Methods */}
                    <h3 className="text-base font-semibold text-text-secondary mb-4">Por Forma de Pagamento</h3>
                    <div className="grid grid-cols-4 gap-4 mb-8 max-md:grid-cols-2">
                        <Card className="flex items-center gap-3.5 p-4!">
                            <div className="w-11 h-11 rounded-md flex items-center justify-center text-xl bg-accent/10"><BsCash className="text-accent" /></div>
                            <div className="flex flex-col"><span className="text-[0.8125rem] text-text-secondary mb-0.5">Dinheiro</span><span className="text-base font-semibold">{formatCurrency(summary.byMethod.money)}</span></div>
                        </Card>
                        <Card className="flex items-center gap-3.5 p-4!">
                            <div className="w-11 h-11 rounded-md flex items-center justify-center text-xl bg-[#00cec9]/10"><FiSmartphone className="text-[#00cec9]" /></div>
                            <div className="flex flex-col"><span className="text-[0.8125rem] text-text-secondary mb-0.5">PIX</span><span className="text-base font-semibold">{formatCurrency(summary.byMethod.pix)}</span></div>
                        </Card>
                        <Card className="flex items-center gap-3.5 p-4!">
                            <div className="w-11 h-11 rounded-md flex items-center justify-center text-xl bg-info/10"><FiCreditCard className="text-info" /></div>
                            <div className="flex flex-col"><span className="text-[0.8125rem] text-text-secondary mb-0.5">Crédito</span><span className="text-base font-semibold">{formatCurrency(summary.byMethod.credit)}</span></div>
                        </Card>
                        <Card className="flex items-center gap-3.5 p-4!">
                            <div className="w-11 h-11 rounded-md flex items-center justify-center text-xl bg-[#9b59b6]/10"><FiCreditCard className="text-[#9b59b6]" /></div>
                            <div className="flex flex-col"><span className="text-[0.8125rem] text-text-secondary mb-0.5">Débito</span><span className="text-base font-semibold">{formatCurrency(summary.byMethod.debit)}</span></div>
                        </Card>
                    </div>

                    {/* Summary */}
                    <h3 className="text-base font-semibold text-text-secondary mb-4">Resumo</h3>
                    <Card className="p-5!">
                        <div className="flex justify-between py-3 border-b border-border text-text-secondary"><span>Total de Pedidos</span><span className="font-semibold text-text-primary">{summary.totalOrders}</span></div>
                        <div className="flex justify-between py-3 border-b border-border text-text-secondary"><span>Pedidos Pagos</span><span className="font-semibold text-text-primary">{summary.paidOrders}</span></div>
                        <div className="flex justify-between py-3 text-text-secondary"><span>Ticket Médio</span><span className="font-semibold text-text-primary">{summary.paidOrders > 0 ? formatCurrency(summary.totalRevenue / summary.paidOrders) : formatCurrency(0)}</span></div>
                    </Card>
                </>
            )}
        </div>
    );
}
