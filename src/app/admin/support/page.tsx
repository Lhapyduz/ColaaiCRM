'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    FiMessageSquare,
    FiClock,
    FiCheckCircle,
    FiAlertCircle,
    FiSend,
    FiX,
    FiUser,
    FiShield,
    FiPaperclip
} from 'react-icons/fi';

interface Ticket {
    id: string;
    tenant_id: string;
    store_name: string;
    subject: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    category: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    is_admin: boolean;
    content: string;
    created_at: string;
}

export default function SupportPage() {
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTickets = useCallback(async () => {

        try {
            const { data: ticketsData } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: settings } = await supabase
                .from('user_settings')
                .select('user_id, app_name');

            interface TicketRow { id: string; tenant_id: string; subject: string; priority: string; status: string; category: string; created_at: string; updated_at: string; }
            interface SettingRow { user_id: string; app_name: string; }
            const combined = (ticketsData as TicketRow[] || []).map((t: TicketRow) => ({
                ...t,
                priority: t.priority as Ticket['priority'],
                status: t.status as Ticket['status'],
                store_name: (settings as SettingRow[] | null)?.find((s: SettingRow) => s.user_id === t.tenant_id)?.app_name || 'N/A'
            }));

            if (combined.length === 0) {
                // Demo data
                setTickets([
                    { id: '1', tenant_id: '1', store_name: 'Hot Dog Express', subject: 'Problema com impressão de pedidos', priority: 'high', status: 'open', category: 'Técnico', created_at: '2025-01-29T10:30:00', updated_at: '2025-01-29T10:30:00' },
                    { id: '2', tenant_id: '2', store_name: 'Fast Burger', subject: 'Dúvida sobre relatórios', priority: 'normal', status: 'in_progress', category: 'Dúvida', created_at: '2025-01-28T14:20:00', updated_at: '2025-01-28T16:45:00' },
                    { id: '3', tenant_id: '3', store_name: 'Dogão do Zé', subject: 'Solicitação de nova funcionalidade', priority: 'low', status: 'resolved', category: 'Sugestão', created_at: '2025-01-27T09:15:00', updated_at: '2025-01-28T11:00:00' },
                    { id: '4', tenant_id: '4', store_name: 'Lanches da Maria', subject: 'Aplicativo não carrega cardápio', priority: 'urgent', status: 'open', category: 'Bug', created_at: '2025-01-29T15:45:00', updated_at: '2025-01-29T15:45:00' },
                ]);
            } else {
                setTickets(combined);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async (ticketId: string) => {

        try {
            const { data } = await supabase
                .from('ticket_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setMessages(data);
            } else {
                // Demo messages
                setMessages([
                    { id: '1', ticket_id: ticketId, sender_id: '1', is_admin: false, content: 'Olá, estou com problemas para imprimir os pedidos. A impressora está conectada mas nada sai.', created_at: '2025-01-29T10:30:00' },
                    { id: '2', ticket_id: ticketId, sender_id: 'admin', is_admin: true, content: 'Olá! Vamos verificar isso. Você poderia informar o modelo da impressora e se ela está configurada como padrão no sistema?', created_at: '2025-01-29T10:35:00' },
                    { id: '3', ticket_id: ticketId, sender_id: '1', is_admin: false, content: 'É uma Epson TM-T20X. Sim, está como padrão.', created_at: '2025-01-29T10:40:00' },
                ]);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const openTicketChat = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        await loadMessages(ticket.id);
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        setSendingMessage(true);

        try {
            const message: Message = {
                id: Date.now().toString(),
                ticket_id: selectedTicket.id,
                sender_id: 'admin',
                is_admin: true,
                content: newMessage,
                created_at: new Date().toISOString()
            };

            // Try to save to database
            await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: selectedTicket.id,
                    sender_id: 'admin',
                    is_admin: true,
                    content: newMessage
                });

            setMessages(prev => [...prev, message]);
            setNewMessage('');

            // Update ticket status to in_progress if it was open
            if (selectedTicket.status === 'open') {
                await supabase
                    .from('support_tickets')
                    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
                    .eq('id', selectedTicket.id);

                setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
                setTickets(prev => prev.map(t =>
                    t.id === selectedTicket.id ? { ...t, status: 'in_progress' as const } : t
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {

        try {
            await supabase
                .from('support_tickets')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
                })
                .eq('id', ticketId);

            setTickets(prev => prev.map(t =>
                t.id === ticketId ? { ...t, status: newStatus } : t
            ));

            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
        }
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Agora mesmo';
        if (hours < 24) return `${hours}h atrás`;
        return d.toLocaleDateString('pt-BR');
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: 'bg-gray-500/20 text-gray-400',
            normal: 'bg-blue-500/20 text-blue-400',
            high: 'bg-amber-500/20 text-amber-400',
            urgent: 'bg-red-500/20 text-red-400',
        };
        const labels: Record<string, string> = {
            low: 'Baixa',
            normal: 'Normal',
            high: 'Alta',
            urgent: 'Urgente',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[priority])}>
                {labels[priority]}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: 'bg-red-500/20 text-red-400',
            in_progress: 'bg-amber-500/20 text-amber-400',
            resolved: 'bg-emerald-500/20 text-emerald-400',
            closed: 'bg-gray-500/20 text-gray-400',
        };
        const labels: Record<string, string> = {
            open: 'Aberto',
            in_progress: 'Em Andamento',
            resolved: 'Resolvido',
            closed: 'Fechado',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
                {labels[status]}
            </span>
        );
    };

    const filteredTickets = statusFilter === 'all'
        ? tickets
        : tickets.filter(t => t.status === statusFilter);

    const columns: Column<Ticket>[] = [
        {
            key: 'subject',
            header: 'Assunto',
            render: (_, row) => (
                <div>
                    <p className="font-medium text-white">{row.subject}</p>
                    <p className="text-gray-500 text-xs">{row.store_name}</p>
                </div>
            )
        },
        {
            key: 'category',
            header: 'Categoria',
            render: (value) => <span className="text-gray-400">{value as string}</span>
        },
        {
            key: 'priority',
            header: 'Prioridade',
            sortable: true,
            render: (value) => getPriorityBadge(value as string)
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value) => getStatusBadge(value as string)
        },
        {
            key: 'created_at',
            header: 'Criado',
            sortable: true,
            render: (value) => <span className="text-gray-400">{formatDate(value as string)}</span>
        },
    ];

    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Suporte & Chamados</h1>
                <p className="text-gray-400 mt-1">Gerencie tickets de suporte dos clientes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Total de Tickets"
                    value={tickets.length}
                    icon={<FiMessageSquare size={24} />}
                    loading={loading}
                />
                <StatsCard
                    title="Abertos"
                    value={openCount}
                    icon={<FiAlertCircle size={24} />}
                    variant={openCount > 0 ? 'danger' : 'default'}
                    loading={loading}
                />
                <StatsCard
                    title="Em Andamento"
                    value={inProgressCount}
                    icon={<FiClock size={24} />}
                    variant={inProgressCount > 0 ? 'warning' : 'default'}
                    loading={loading}
                />
                <StatsCard
                    title="Resolvidos (Mês)"
                    value={resolvedCount}
                    icon={<FiCheckCircle size={24} />}
                    variant="success"
                    loading={loading}
                />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                            statusFilter === status
                                ? "bg-orange-500 text-white"
                                : "bg-gray-800 text-gray-400 hover:text-white"
                        )}
                    >
                        {status === 'all' ? 'Todos' :
                            status === 'open' ? 'Abertos' :
                                status === 'in_progress' ? 'Em Andamento' :
                                    status === 'resolved' ? 'Resolvidos' : 'Fechados'}
                    </button>
                ))}
            </div>

            {/* Tickets Table */}
            <DataTable
                columns={columns}
                data={filteredTickets}
                keyField="id"
                searchPlaceholder="Buscar ticket..."
                onRowClick={openTicketChat}
                loading={loading}
                emptyMessage="Nenhum ticket encontrado"
            />

            {/* Chat Panel */}
            {selectedTicket && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setSelectedTicket(null)}
                    />
                    <div className="fixed right-0 top-0 h-screen w-[500px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-white truncate">{selectedTicket.subject}</h2>
                                    <p className="text-gray-400 text-sm">{selectedTicket.store_name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 ml-4"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Status Actions */}
                            <div className="flex items-center gap-2 mt-4">
                                <span className="text-gray-500 text-sm">Status:</span>
                                {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => updateTicketStatus(selectedTicket.id, status as Ticket['status'])}
                                        className={cn(
                                            "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                            selectedTicket.status === status
                                                ? "bg-orange-500 text-white"
                                                : "bg-gray-800 text-gray-400 hover:text-white"
                                        )}
                                    >
                                        {status === 'open' ? 'Aberto' :
                                            status === 'in_progress' ? 'Em Andamento' :
                                                status === 'resolved' ? 'Resolvido' : 'Fechado'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3",
                                        msg.is_admin && "flex-row-reverse"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.is_admin ? "bg-orange-500" : "bg-gray-700"
                                    )}>
                                        {msg.is_admin ? (
                                            <FiShield size={16} className="text-white" />
                                        ) : (
                                            <FiUser size={16} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "max-w-[80%] rounded-lg p-3",
                                        msg.is_admin
                                            ? "bg-orange-500/20 border border-orange-500/30"
                                            : "bg-gray-800 border border-gray-700"
                                    )}>
                                        <p className="text-white text-sm">{msg.content}</p>
                                        <p className="text-gray-500 text-xs mt-1">{formatTime(msg.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-end gap-3">
                                <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400">
                                    <FiPaperclip size={20} />
                                </button>
                                <div className="flex-1">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Digite sua resposta..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sendingMessage}
                                    className={cn(
                                        "p-3 rounded-lg transition-all",
                                        "bg-linear-to-r from-orange-500 to-red-500 text-white",
                                        "hover:from-orange-600 hover:to-red-600",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                >
                                    <FiSend size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
