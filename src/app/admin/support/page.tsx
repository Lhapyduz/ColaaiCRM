'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
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
    FiPaperclip,
    FiTrash2,
    FiEdit2
} from 'react-icons/fi';
import {
    adminGetTickets,
    adminGetTicketMessages,
    adminSendMessage,
    adminUpdateTicketStatus,
    adminDeleteTicket,
    adminUpdateTicketDetails
} from '@/actions/support';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase'; // We can use public client for realtime channel 

interface Ticket {
    id: string;
    tenant_id: string;
    store_name: string; // added manually
    tenant_email?: string;
    subject: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    category: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    sender_role: string;
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
    const { success, error } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<{
        subject: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        category: string;
    }>({ subject: '', priority: 'medium', category: '' });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTickets = useCallback(async () => {
        try {
            const data = await adminGetTickets();
            setTickets(data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            error('Erro ao carregar tickets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();

        // Subscribe to ticket changes
        const channel = supabase
            .channel('admin_support_tickets')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'support_tickets'
            }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTickets]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (selectedTicket) {
            // Load messages
            loadMessages(selectedTicket.id);

            // Subscribe to new messages for this ticket
            const channel = supabase
                .channel(`admin_ticket_${selectedTicket.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                }, (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        // Verifica se a mensagem já existe pelo ID (UUID do Supabase)
                        if (prev.find(m => m.id === newMsg.id)) return prev;

                        // Verifica se existe uma mensagem otimista idêntica (mesmo conteúdo e remetente)
                        // Mensagens otimistas têm IDs numéricos (Date.now().toString())
                        const optimisticMatch = prev.find(m =>
                            m.content === newMsg.content &&
                            m.sender_role === newMsg.sender_role &&
                            /^\d+$/.test(m.id)
                        );

                        if (optimisticMatch) {
                            // Substitui a mensagem otimista pela real do Supabase
                            return prev.map(m => m.id === optimisticMatch.id ? newMsg : m);
                        }

                        return [...prev, newMsg];
                    });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedTicket]);

    const loadMessages = async (ticketId: string) => {
        try {
            const data = await adminGetTicketMessages(ticketId);
            setMessages(data as Message[]);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const openTicketChat = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        setSendingMessage(true);

        const tempId = Date.now().toString();
        const optimisticMsg: Message = {
            id: tempId,
            ticket_id: selectedTicket.id,
            sender_id: 'super_admin',
            sender_role: 'admin',
            content: newMessage,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        try {
            await adminSendMessage(selectedTicket.id, optimisticMsg.content);
            // Updated in background by realtime
        } catch (err) {
            console.error('Error sending message:', err);
            error('Erro ao enviar mensagem');
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setSendingMessage(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
        try {
            await adminUpdateTicketStatus(ticketId, newStatus);
            success(`Status atualizado para ${getStatusLabel(newStatus)}`);

            // Optimistic update
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        } catch (err) {
            console.error('Error updating ticket status:', err);
            error('Erro ao atualizar status');
        }
    };

    const handleEditClick = () => {
        if (!selectedTicket) return;
        setEditData({
            subject: selectedTicket.subject,
            priority: selectedTicket.priority,
            category: selectedTicket.category
        });
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedTicket) return;
        try {
            await adminUpdateTicketDetails(selectedTicket.id, editData);
            success('Ticket atualizado');
            setSelectedTicket({ ...selectedTicket, ...editData });
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...editData } : t));
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating ticket:', err);
            error('Erro ao atualizar ticket');
        }
    };

    const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
        e.stopPropagation(); // Prevent opening chat
        if (!confirm('Tem certeza que deseja apagar este ticket e todas as mensagens?')) return;

        try {
            await adminDeleteTicket(ticketId);
            success('Ticket excluído');
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(null);
            }
            // List will auto-update via realtime or explicit re-fetch needed if realtime is slow
            // Realtime delete event should trigger fetchTickets
        } catch (err) {
            console.error('Error deleting ticket:', err);
            error('Erro ao excluir ticket');
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
            medium: 'bg-blue-500/20 text-blue-400',
            high: 'bg-amber-500/20 text-amber-400',
            urgent: 'bg-red-500/20 text-red-400',
        };
        const labels: Record<string, string> = {
            low: 'Baixa',
            medium: 'Normal',
            high: 'Alta',
            urgent: 'Urgente',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[priority])}>
                {labels[priority]}
            </span>
        );
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            open: 'Aberto',
            in_progress: 'Em Andamento',
            resolved: 'Resolvido',
            closed: 'Fechado',
        };
        return labels[status];
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: 'bg-red-500/20 text-red-400',
            in_progress: 'bg-amber-500/20 text-amber-400',
            resolved: 'bg-emerald-500/20 text-emerald-400',
            closed: 'bg-gray-500/20 text-gray-400',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
                {getStatusLabel(status)}
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
                <div className="flex justify-between items-center w-full">
                    <div>
                        <p className="font-medium text-white">{row.subject}</p>
                        <p className="text-gray-500 text-xs">{row.store_name} {row.tenant_email && `(${row.tenant_email})`}</p>
                    </div>
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
        {
            key: 'id',
            header: 'Ações',
            render: (_, row) => (
                <button
                    onClick={(e) => handleDeleteTicket(e, row.id)}
                    className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded text-gray-400 transition-colors"
                    title="Excluir ticket"
                >
                    <FiTrash2 size={16} />
                </button>
            )
        }
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
                    title="Resolvidos"
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
                        {status === 'all' ? 'Todos' : getStatusLabel(status)}
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
                    <div className="fixed right-0 top-0 h-screen w-[500px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl animate-slideLeft">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-700 bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-white truncate">{selectedTicket.subject}</h2>
                                    <p className="text-gray-400 text-sm">{selectedTicket.store_name}</p>
                                </div>
                                <button
                                    onClick={handleEditClick}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 ml-4"
                                    title="Editar Ticket"
                                >
                                    <FiEdit2 size={20} />
                                </button>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 ml-4"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Status Actions */}
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <span className="text-gray-500 text-sm">Status:</span>
                                {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => updateTicketStatus(selectedTicket.id, status as Ticket['status'])}
                                        className={cn(
                                            "px-3 py-1 rounded-lg text-xs font-medium transition-all border border-transparent",
                                            selectedTicket.status === status
                                                ? "bg-orange-500 text-white"
                                                : "bg-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
                                        )}
                                    >
                                        {getStatusLabel(status)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 mt-10">
                                    Nenhuma mensagem ainda.
                                </div>
                            )}
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3",
                                        msg.sender_role === 'admin' && "flex-row-reverse"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.sender_role === 'admin' ? "bg-orange-500" : "bg-gray-700"
                                    )}>
                                        {msg.sender_role === 'admin' ? (
                                            <FiShield size={16} className="text-white" />
                                        ) : (
                                            <FiUser size={16} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "max-w-[80%] rounded-2xl p-3 text-sm",
                                        msg.sender_role === 'admin'
                                            ? "bg-orange-500/20 border border-orange-500/30 text-white rounded-tr-none"
                                            : "bg-gray-800 border border-gray-700 text-white rounded-tl-none"
                                    )}>
                                        <p>{msg.content}</p>
                                        <p className="text-gray-500 text-[10px] mt-1 text-right">{formatTime(msg.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-700 bg-gray-800">
                            <div className="flex items-end gap-3">
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
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sendingMessage}
                                    className={cn(
                                        "p-3 rounded-lg transition-all h-[50px] w-[50px] flex items-center justify-center",
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

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar Ticket</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Assunto</label>
                                <input
                                    value={editData.subject}
                                    onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Categoria</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg h-[42px] px-3 focus:outline-none focus:border-orange-500 text-white"
                                        value={editData.category}
                                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                    >
                                        <option value="Dúvida">Dúvida</option>
                                        <option value="Problema Técnico">Problema Técnico</option>
                                        <option value="Financeiro">Financeiro</option>
                                        <option value="Sugestão">Sugestão</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Prioridade</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg h-[42px] px-3 focus:outline-none focus:border-orange-500 text-white"
                                        value={editData.priority}
                                        onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Normal</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 px-4 py-2 bg-orange-500 rounded-lg text-white font-bold hover:bg-orange-600 transition-colors"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
