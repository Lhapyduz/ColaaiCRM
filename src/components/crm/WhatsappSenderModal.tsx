'use client';

import React, { useState, useMemo } from 'react';
import { FiX, FiMessageCircle, FiExternalLink, FiUser, FiInfo } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerCRM } from './CustomerListTab';

interface WhatsappSenderModalProps {
    recipients: CustomerCRM[];
    onClose: () => void;
}

export function WhatsappSenderModal({ recipients, onClose }: WhatsappSenderModalProps) {
    const { userSettings } = useAuth();
    const [message, setMessage] = useState(
        'Olá {nome}! Tudo bem? Sentimos sua falta aqui no {estabelecimento}. Temos um cupom especial para você!'
    );

    // Variáveis que podem ser inseridas
    const insertVariable = (variable: string) => {
        setMessage(prev => prev + ` {${variable}}`);
    };

    const getParsedMessage = (msg: string, customer: CustomerCRM) => {
        let parsed = msg.replace(/{nome}/g, customer.name.split(' ')[0] || '');
        parsed = parsed.replace(/{estabelecimento}/g, userSettings?.app_name || 'nosso estabelecimento');
        return parsed;
    };

    // Filtra pessoas que não tem celular devidamente cadastrado ou só tem fixo (ignoramos essa limitação fina para um MVP, mas limpamos os não numéricos)
    const validRecipients = useMemo(() => {
        return recipients.filter(r => r.phone && r.phone.replace(/\D/g, '').length >= 10);
    }, [recipients]);

    const getWhatsappLink = (phone: string, text: string) => {
        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    };

    const handleOpenNext = (index: number) => {
        const customer = validRecipients[index];
        const parsedMessage = getParsedMessage(message, customer);
        const link = getWhatsappLink(customer.phone, parsedMessage);
        window.open(link, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={onClose}>
            <div className="bg-bg-card border border-border rounded-lg w-full max-w-[600px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center text-xl">
                            <FiMessageCircle />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Disparo de WhatsApp</h2>
                            <p className="text-sm text-text-secondary">{validRecipients.length} cliente(s) selecionado(s)</p>
                        </div>
                    </div>
                    <button className="text-text-secondary hover:text-text-primary text-xl" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                    {validRecipients.length < recipients.length && (
                        <div className="p-3 bg-warning/10 text-warning border border-warning/20 rounded-md text-sm flex items-start gap-2">
                            <FiInfo className="text-lg shrink-0 mt-0.5" />
                            <span>
                                {recipients.length - validRecipients.length} cliente(s) foram ignorados por não possuírem um telefone válido.
                            </span>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary">Mensagem</label>
                        <textarea
                            className="w-full h-[120px] bg-bg-tertiary border border-border rounded-md p-4 text-text-primary resize-none outline-none focus:border-primary transition-colors"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escreva sua mensagem aqui..."
                        />
                        <div className="flex gap-2">
                            <button
                                className="text-xs px-2 py-1 bg-bg-tertiary border border-border rounded hover:bg-border transition-colors flex items-center gap-1"
                                onClick={() => insertVariable('nome')}
                            >
                                <FiUser /> {'{nome}'}
                            </button>
                            <button
                                className="text-xs px-2 py-1 bg-bg-tertiary border border-border rounded hover:bg-border transition-colors flex items-center gap-1"
                                onClick={() => insertVariable('estabelecimento')}
                            >
                                {'{estabelecimento}'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-medium text-text-secondary">Visualização e Envio</h3>
                        <p className="text-xs text-text-muted mb-2">Para evitar bloqueios pelo WhatsApp, o envio é manual. Clique no botão de cada cliente para enviar a mensagem em uma aba nova do WhatsApp Web.</p>

                        <div className="max-h-[250px] overflow-y-auto pr-2 flex flex-col gap-2">
                            {validRecipients.map((customer, index) => (
                                <div key={customer.id} className="p-3 border border-border rounded-md bg-bg-tertiary flex justify-between items-center gap-4">
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium text-sm truncate">{customer.name}</span>
                                        <span className="text-xs text-text-muted">{customer.phone}</span>
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="shrink-0 bg-[#25D366] hover:bg-[#128C7E] text-white border-none py-1.5"
                                        leftIcon={<FiExternalLink />}
                                        onClick={() => handleOpenNext(index)}
                                    >
                                        Abrir Zap
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}
