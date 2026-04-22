'use client';

import React, { useState } from 'react';
import { FiSearch, FiMessageCircle, FiFilter, FiUser, FiClock, FiShoppingBag } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';
import { WhatsappSenderModal } from './WhatsappSenderModal';
import { useCustomersCache, useOrdersCache } from '@/hooks/useDataCache';

export interface CustomerCRM {
    id: string;
    phone: string;
    name: string;
    email: string | null;
    total_points: number;
    total_spent: number;
    total_orders: number;
    created_at: string | null;
    last_order_date?: string | null; // Pode ser mapeado via pedidos
}

export function CustomerListTab() {
    const { customers: rawCustomers, loading: loadingCustomers } = useCustomersCache();
    const { orders: rawOrders, loading: loadingOrders } = useOrdersCache();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInactive, setFilterInactive] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
    const [showWhatsappModal, setShowWhatsappModal] = useState(false);

    const loading = loadingCustomers && loadingOrders;

    const customers = React.useMemo(() => {
        const lastOrdersMap = new Map<string, string | null>();
        if (rawOrders) {
            rawOrders.forEach(order => {
                if (order.customer_phone && !lastOrdersMap.has(order.customer_phone)) {
                    lastOrdersMap.set(order.customer_phone, order.created_at);
                }
            });
        }

        return (rawCustomers || []).map(c => ({
            ...c,
            last_order_date: lastOrdersMap.get(c.phone) || c.created_at
        })).sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
    }, [rawCustomers, rawOrders]);

    // Lógica de inatividade (mais de 30 dias)
    const isInactive = (dateStr?: string | null) => {
        if (!dateStr) return false;
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays > 30;
    };

    // Filter
    const filteredCustomers = React.useMemo(() => {
        let result = customers;
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            const digits = searchTerm.replace(/\D/g, '');
            result = result.filter(c =>
                c.name.toLowerCase().includes(query) ||
                (digits && c.phone.includes(digits))
            );
        }
        if (filterInactive) {
            result = result.filter(c => isInactive(c.last_order_date));
        }
        return result;
    }, [customers, searchTerm, filterInactive]);

    // Seleção
    const toggleSelectAll = () => {
        if (selectedCustomerIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
            setSelectedCustomerIds(new Set());
        } else {
            setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
        }
    };

    const toggleSelectCustomer = (id: string) => {
        const next = new Set(selectedCustomerIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCustomerIds(next);
    };

    const selectedCustomersList = customers.filter(c => selectedCustomerIds.has(c.id));

    // Utils visuais
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Nunca';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    };

    return (
        <div className="flex flex-col gap-6">
            <Card className="flex items-center justify-between gap-4 flex-wrap p-4!">
                <div className="flex items-start sm:items-center flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
                    <Input
                        placeholder="Buscar por nome ou telefone..."
                        leftIcon={<FiSearch />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 w-full sm:w-auto"
                    />
                    <button
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border rounded-md text-sm font-medium transition-all",
                            filterInactive && "bg-accent/10 border-accent text-accent"
                        )}
                        onClick={() => setFilterInactive(!filterInactive)}
                    >
                        <FiFilter /> Inativos (+30 dias)
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
                    <span className="text-sm text-text-muted text-center sm:text-left">
                        {selectedCustomerIds.size} selecionado(s)
                    </span>
                    <Button
                        leftIcon={<FiMessageCircle />}
                        variant={selectedCustomerIds.size > 0 ? "primary" : "outline"}
                        disabled={selectedCustomerIds.size === 0}
                        onClick={() => setShowWhatsappModal(true)}
                        className="w-full sm:w-auto"
                    >
                        Disparar WhatsApp
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden p-0!">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg-tertiary border-b border-border">
                                <th className="p-4 w-[50px] whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="w-[18px] h-[18px] cursor-pointer accent-primary"
                                        checked={selectedCustomerIds.size > 0 && selectedCustomerIds.size === filteredCustomers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Cliente</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Telefone</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary whitespace-nowrap hidden sm:table-cell">Última Compra</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary whitespace-nowrap hidden md:table-cell">Total Pedidos</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary whitespace-nowrap hidden sm:table-cell">Gastos</th>
                                <th className="p-4 text-center text-sm font-semibold text-text-secondary whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-text-muted">Carregando clientes...</td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-text-muted">Nenhum cliente encontrado.</td>
                                </tr>
                            ) : (
                                filteredCustomers.map(customer => {
                                    const inactive = isInactive(customer.last_order_date);
                                    return (
                                        <tr key={customer.id} className={cn(
                                            "border-b border-border hover:bg-bg-tertiary/50 transition-colors",
                                            selectedCustomerIds.has(customer.id) && "bg-primary/5"
                                        )}>
                                            <td className="p-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    className="w-[18px] h-[18px] cursor-pointer accent-primary"
                                                    checked={selectedCustomerIds.has(customer.id)}
                                                    onChange={() => toggleSelectCustomer(customer.id)}
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-secondary shrink-0">
                                                        <FiUser />
                                                    </div>
                                                    <span className="font-medium text-text-primary">{customer.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-text-secondary whitespace-nowrap">{customer.phone}</td>
                                            <td className="p-4 text-text-secondary whitespace-nowrap hidden sm:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <FiClock className={inactive ? "text-error" : "text-text-muted"} />
                                                    <span className={inactive ? "text-error" : ""}>{formatDate(customer.last_order_date)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-text-secondary whitespace-nowrap hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <FiShoppingBag className="text-primary hidden md:block" /> {customer.total_orders || 0}
                                                </div>
                                            </td>
                                            <td className="p-4 font-semibold text-[#27ae60] whitespace-nowrap hidden sm:table-cell">
                                                {formatCurrency(customer.total_spent || 0)}
                                            </td>
                                            <td className="p-4 text-center whitespace-nowrap">
                                                {inactive ? (
                                                    <span className="px-2 py-1 bg-error/10 text-error rounded-full text-xs font-medium">Inativo</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-[#27ae60]/10 text-[#27ae60] rounded-full text-xs font-medium">Ativo</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Disparo (implementado em outro arquivo para organizar) */}
            {showWhatsappModal && (
                <WhatsappSenderModal
                    recipients={selectedCustomersList}
                    onClose={() => setShowWhatsappModal(false)}
                />
            )}
        </div>
    );
}
