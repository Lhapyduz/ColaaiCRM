'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    FiPackage,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiCheck,
    FiX,
    FiSave,
    FiActivity,
    FiDollarSign
} from 'react-icons/fi';

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    interval: string;
    active: boolean;
    created_at: string;
}

export default function PlansPage() {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);

    // Fetch plans from subscription_plans (Source of Truth)
    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price_cents', { ascending: true });

            if (error) throw error;

            // Map to local interface
            const mapped: Plan[] = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price_cents: p.price_cents,
                interval: p.billing_interval || 'monthly',
                active: p.is_active,
                created_at: p.created_at
            }));

            setPlans(mapped);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const columns: Column<Plan>[] = [
        {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (_, row) => (
                <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-gray-500 text-xs">{row.description}</p>
                </div>
            )
        },
        {
            key: 'price_cents',
            header: 'Preço',
            sortable: true,
            render: (val) => <span className="text-white font-medium">{formatCurrency(val as number)}</span>
        },
        {
            key: 'active',
            header: 'Status',
            render: (_, row) => (
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit",
                    row.active
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                )}>
                    {row.active ? 'Ativo' : 'Inativo'}
                </span>
            )
        }
    ];

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Planos do Sistema</h1>
                    <p className="text-gray-400 mt-1">Planos sincronizados com Stripe e Supabase</p>
                </div>
                {/* 
                <button
                    onClick={() => {}} 
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-gray-700 text-gray-400 cursor-not-allowed"
                    disabled
                >
                    <FiRefreshCw size={18} />
                    Sincronizar (Automático)
                </button>
                */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard
                    title="Total de Planos"
                    value={plans.length}
                    icon={<FiPackage size={24} />}
                    loading={loading}
                />
                <StatsCard
                    title="Planos Ativos"
                    value={plans.filter(p => p.active).length}
                    icon={<FiCheck size={24} />}
                    variant="success"
                    loading={loading}
                />
                <StatsCard
                    title="Ticket Médio"
                    value={formatCurrency(plans.length ? plans.reduce((a, b) => a + b.price_cents, 0) / plans.length : 0)}
                    icon={<FiDollarSign size={24} />}
                    loading={loading}
                    variant="warning"
                />
            </div>

            <DataTable
                columns={columns}
                data={plans}
                keyField="id"
                loading={loading}
                searchPlaceholder="Buscar planos..."
            />
        </div>
    );
}
