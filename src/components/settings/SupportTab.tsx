'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiPlus, FiSend, FiX, FiUser, FiHeadphones,
    FiClock, FiChevronLeft
} from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
    createTicket,
    sendMessage,
    getTenantTickets,
    getTicketMessages,
    type TicketData
} from '@/actions/support';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

interface Ticket {
    id: string;
    subject: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    category: string;
    created_at: string;
    messages?: { count: number }[];
}

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    sender_role: string;
    content: string;
    created_at: string;
}

export default function SupportTab() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const { success, error } = useToast();

    // New Ticket Modal State
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newTicketData, setNewTicketData] = useState<TicketData>({
        subject: '',
        priority: 'medium',
        category: 'Dúvida'
    });
    const [creating, setCreating] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTickets = useCallback(async () => {
        try {
            const data = await getTenantTickets();
            // Cast data to Ticket[] because the query returns a complex object structure
            // and we need to ensure TypeScript is happy.
            setTickets(data as unknown as Ticket[]);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            error('Erro ao carregar tickets');
        } finally {
            setLoading(false);
        }
    }, [error]);

    useEffect(() => {
        fetchTickets();

        // Subscription for real-time ticket updates (e.g. status change)
        const channel = supabase
            .channel('support_tickets_tenant')
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
        if (selectedTicket) {
            loadMessages(selectedTicket.id);

            // Subscribe to new messages for this ticket
            const channel = supabase
                .channel(`ticket_${selectedTicket.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                }, (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        // Verifica se a mensagem já existe pelo ID
                        if (prev.find(m => m.id === newMsg.id)) return prev;

                        // Verifica se existe uma mensagem otimista idêntica
                        const optimisticMatch = prev.find(m =>
                            m.content === newMsg.content &&
                            m.sender_role === newMsg.sender_role &&
                            (m.id === 'temp' || /^\d+$/.test(m.id))
                        );

                        if (optimisticMatch) {
                            // Substitui a mensagem otimista pela real
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async (ticketId: string) => {
        try {
            const data = await getTicketMessages(ticketId);
            setMessages(data as Message[]);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicketData.subject.trim()) {
            error('Assunto é obrigatório');
            return;
        }

        setCreating(true);
        try {
            const ticket = await createTicket(newTicketData);
            setTickets(prev => [ticket as unknown as Ticket, ...prev]);
            setShowNewTicket(false);
            setNewTicketData({ subject: '', priority: 'medium', category: 'Dúvida' });
            success('Ticket criado com sucesso!');

            // Automatically open chat
            setSelectedTicket(ticket as unknown as Ticket);
            setView('chat');
        } catch (err) {
            console.error('Error creating ticket:', err);
            error('Erro ao criar ticket');
        } finally {
            setCreating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;

        const tempId = Date.now().toString();
        const optimisticMsg: Message = {
            id: tempId,
            ticket_id: selectedTicket.id,
            sender_id: 'me', // placeholder
            sender_role: 'tenant',
            content: newMessage,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setSendingMsg(true);

        try {
            await sendMessage(selectedTicket.id, optimisticMsg.content);
            // Real-time subscription will update the ID and official state
        } catch (err) {
            console.error('Error sending message:', err);
            error('Erro ao enviar mensagem');
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setSendingMsg(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: 'bg-green-500/20 text-green-400',
            in_progress: 'bg-amber-500/20 text-amber-400',
            resolved: 'bg-blue-500/20 text-blue-400',
            closed: 'bg-gray-500/20 text-gray-400',
        };
        const labels: Record<string, string> = {
            open: 'Aberto',
            in_progress: 'Respondido', // Friendly name for tenant
            resolved: 'Resolvido',
            closed: 'Fechado',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
                {labels[status]}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const labels: Record<string, string> = {
            low: 'Baixa',
            medium: 'Normal',
            high: 'Alta',
            urgent: 'Urgente',
        };
        return <span className="text-gray-400 text-xs">{labels[priority]}</span>;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    if (view === 'chat' && selectedTicket) {
        return (
            <div className="h-[600px] flex flex-col bg-bg-card rounded-xl border border-border overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-bg-tertiary flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setView('list'); setSelectedTicket(null); }}
                            className="p-2 hover:bg-bg-card rounded-full transition-colors"
                        >
                            <FiChevronLeft size={20} />
                        </button>
                        <div>
                            <h3 className="font-bold text-text-primary text-lg">{selectedTicket.subject}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn("w-2 h-2 rounded-full",
                                    selectedTicket.status === 'open' ? "bg-green-500" :
                                        selectedTicket.status === 'in_progress' ? "bg-amber-500" :
                                            "bg-gray-500"
                                )} />
                                <span className="text-xs text-text-secondary">Protocolo: {selectedTicket.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/50">
                    {messages.length === 0 ? (
                        <div className="text-center py-10 text-text-muted">
                            <p>Envie uma mensagem para iniciar o atendimento.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.sender_role !== 'admin' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    msg.sender_role === 'admin' ? "bg-orange-500" : "bg-bg-tertiary"
                                )}>
                                    {msg.sender_role === 'admin' ? <FiHeadphones className="text-white" size={14} /> : <FiUser className="text-text-muted" size={14} />}
                                </div>
                                <div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm",
                                        msg.sender_role !== 'admin'
                                            ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10"
                                            : "bg-bg-tertiary text-text-primary rounded-tl-none border border-border"
                                    )}>
                                        {msg.content}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] text-text-muted mt-1 block",
                                        msg.sender_role !== 'admin' ? "text-right" : "text-left"
                                    )}>
                                        {formatDate(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-bg-tertiary border-t border-border">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex gap-3"
                    >
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        <Button
                            type="submit"
                            disabled={!newMessage.trim() || sendingMsg}
                            className={cn("w-12 h-12 p-0! rounded-xl flex items-center justify-center")}
                            isLoading={sendingMsg}
                        >
                            <FiSend size={20} />
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Suporte</h2>
                    <p className="text-text-secondary">Tire dúvidas e reporte problemas diretamente com nossa equipe.</p>
                </div>
                <Button
                    onClick={() => setShowNewTicket(true)}
                    leftIcon={<FiPlus />}
                >
                    Novo Chamado
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-bg-card animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-16 bg-bg-card rounded-xl border border-dashed border-border">
                    <div className="bg-bg-tertiary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiHeadphones size={32} className="text-text-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Você ainda não tem chamados</h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                        Precisa de ajuda com alguma coisa? Abra um novo chamado e nossa equipe te responderá o mais rápido possível.
                    </p>
                    <Button onClick={() => setShowNewTicket(true)} variant="outline">
                        Abrir meu primeiro chamado
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => { setSelectedTicket(ticket); setView('chat'); }}
                            className="bg-bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">
                                            {ticket.subject}
                                        </span>
                                        {getStatusBadge(ticket.status)}
                                    </div>
                                    <p className="text-text-secondary text-sm flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <FiClock size={14} /> {formatDate(ticket.created_at)}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {getPriorityBadge(ticket.priority)}
                                        </span>
                                        <span>•</span>
                                        <span>{ticket.category}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-bg-tertiary text-text-secondary px-3 py-1 rounded-lg text-xs font-mono">
                                        #{ticket.id.slice(0, 8)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Ticket Modal */}
            {showNewTicket && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay" onClick={() => setShowNewTicket(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 z-modal shadow-2xl animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-text-primary">Novo Chamado</h3>
                            <button onClick={() => setShowNewTicket(false)} className="text-text-muted hover:text-text-primary">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-1">Assunto</label>
                                <Input
                                    value={newTicketData.subject}
                                    onChange={(e) => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                                    placeholder="Ex: Problema com pedidos"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Categoria</label>
                                    <select
                                        className="w-full bg-bg-tertiary border border-border rounded-lg h-[42px] px-3 focus:outline-none focus:border-primary text-text-primary"
                                        value={newTicketData.category}
                                        onChange={(e) => setNewTicketData({ ...newTicketData, category: e.target.value })}
                                    >
                                        <option value="Dúvida">Dúvida</option>
                                        <option value="Problema Técnico">Problema Técnico</option>
                                        <option value="Financeiro">Financeiro</option>
                                        <option value="Sugestão">Sugestão</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Prioridade</label>
                                    <select
                                        className="w-full bg-bg-tertiary border border-border rounded-lg h-[42px] px-3 focus:outline-none focus:border-primary text-text-primary"
                                        value={newTicketData.priority}
                                        onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Normal</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowNewTicket(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleCreateTicket}
                                    isLoading={creating}
                                >
                                    Criar Chamado
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
