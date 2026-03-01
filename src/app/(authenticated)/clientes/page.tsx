'use client';

import React, { useState } from 'react';
import { FiUsers, FiGift, FiPercent } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { FidelidadeTab } from '@/components/crm/FidelidadeTab';
import { CuponsTab } from '@/components/crm/CuponsTab';
import { CustomerListTab } from '@/components/crm/CustomerListTab';

type TabType = 'crm' | 'fidelidade' | 'cupons';

export default function ClientesPage() {
    const [activeTab, setActiveTab] = useState<TabType>('crm');

    return (
        <div className="max-w-[1200px] mx-auto p-6 max-md:p-4">
            {/* Header unificado */}
            <div className="mb-6">
                <h1 className="text-[2rem] font-bold mb-2">Clientes & Engajamento</h1>
                <p className="text-text-secondary">
                    Gerencie a base de clientes, histórico de pedidos, fidelidade e cupons.
                </p>
            </div>

            {/* Abas Superiores */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto hide-scrollbar">
                <button
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 bg-transparent border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:bg-bg-tertiary whitespace-nowrap',
                        activeTab === 'crm' && 'bg-primary border-primary text-white'
                    )}
                    onClick={() => setActiveTab('crm')}
                >
                    <FiUsers className="text-lg" />
                    Lista de Clientes (CRM)
                </button>
                <button
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 bg-transparent border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:bg-bg-tertiary whitespace-nowrap',
                        activeTab === 'fidelidade' && 'bg-primary border-primary text-white'
                    )}
                    onClick={() => setActiveTab('fidelidade')}
                >
                    <FiGift className="text-lg" />
                    Programa de Fidelidade
                </button>
                <button
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 bg-transparent border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:bg-bg-tertiary whitespace-nowrap',
                        activeTab === 'cupons' && 'bg-primary border-primary text-white'
                    )}
                    onClick={() => setActiveTab('cupons')}
                >
                    <FiPercent className="text-lg" />
                    Cupons de Desconto
                </button>
            </div>

            {/* Conteúdo da Aba Ativa */}
            <div className="mt-4">
                {activeTab === 'crm' && <CustomerListTab />}
                {activeTab === 'fidelidade' && <FidelidadeTab />}
                {activeTab === 'cupons' && <CuponsTab />}
            </div>
        </div>
    );
}
