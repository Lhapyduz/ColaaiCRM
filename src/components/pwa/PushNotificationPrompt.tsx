'use client';

import React, { useCallback } from 'react';
import { FiBell, FiBellOff } from 'react-icons/fi';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface PushNotificationPromptProps {
    collapsed?: boolean;
}

export function PushNotificationPrompt({ collapsed = false }: PushNotificationPromptProps) {
    const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
    const { user } = useAuth();

    const handleToggle = useCallback(async () => {
        if (loading) return;

        if (isSubscribed) {
            const success = await unsubscribe();
            if (success) {
                toast.success('Notificações desativadas.');
            } else {
                toast.error('Erro ao desativar notificações.');
            }
        } else {
            const success = await subscribe();
            if (success) {
                toast.success('🔔 Notificações ativadas com sucesso!');
                // Enviar notificação de teste automaticamente ao ativar
                if (user?.id) {
                    setTimeout(async () => {
                        try {
                            const res = await fetch(`/api/push/test?userId=${user.id}`);
                            const data = await res.json();
                            console.log('[Push] Teste enviado:', data);
                            if (data.sent === 0) {
                                toast('Nenhuma subscription encontrada. Tente recarregar a página.', { icon: '⚠️' });
                            }
                        } catch (e) {
                            console.error('[Push] Erro no teste:', e);
                        }
                    }, 1500);
                }
            } else {
                if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
                    toast.error('Permissão negada. Ative nas configurações do navegador.');
                } else {
                    toast.error('Não foi possível ativar as notificações.');
                }
            }
        }
    }, [loading, isSubscribed, subscribe, unsubscribe, user]);

    const handleTest = useCallback(async () => {
        if (!user?.id) {
            toast.error('Usuário não autenticado.');
            return;
        }
        try {
            toast.loading('Enviando teste...', { id: 'push-test' });
            const res = await fetch(`/api/push/test?userId=${user.id}`);
            const data = await res.json();
            console.log('[Push Test] Resposta:', data);

            if (data.sent > 0) {
                toast.success(`Notificação enviada! (${data.sent} dispositivo(s))`, { id: 'push-test' });
            } else if (data.failed > 0) {
                toast.error(`Falha ao enviar. ${data.cleaned} subscriptions expiradas removidas.`, { id: 'push-test' });
            } else {
                toast.error('Nenhuma subscription encontrada. Desative e ative novamente.', { id: 'push-test' });
            }
        } catch (e) {
            console.error('[Push Test] Erro:', e);
            toast.error('Erro ao enviar teste.', { id: 'push-test' });
        }
    }, [user]);

    // Não renderiza se o navegador não suporta push notifications
    if (!isSupported) return null;

    return (
        <div className="flex flex-col gap-0.5">
            <button
                onClick={handleToggle}
                disabled={loading}
                title={isSubscribed ? 'Desativar notificações' : 'Ativar notificações push'}
                className={cn(
                    'relative flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary no-underline transition-colors duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                    'hover:bg-bg-tertiary hover:text-text-primary',
                    isSubscribed && 'text-primary',
                    loading && 'opacity-50 cursor-not-allowed',
                    collapsed && 'justify-center px-3.5'
                )}
            >
                {isSubscribed ? (
                    <FiBell className="text-xl shrink-0" />
                ) : (
                    <FiBellOff className="text-xl shrink-0" />
                )}
                {!collapsed && (
                    <span className="whitespace-nowrap overflow-hidden">
                        {loading ? 'Processando...' : isSubscribed ? 'Notificações' : 'Ativar Alertas'}
                    </span>
                )}
                {/* Indicador de status */}
                {isSubscribed && !collapsed && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-green-500 shrink-0" />
                )}
            </button>

            {/* Botão de teste - aparece apenas quando inscrito */}
            {isSubscribed && !collapsed && (
                <button
                    onClick={handleTest}
                    className="flex items-center gap-2 px-4 py-1.5 ml-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors border-none bg-transparent cursor-pointer"
                    title="Enviar notificação de teste"
                >
                    <span>🧪</span>
                    <span>Testar notificação</span>
                </button>
            )}
        </div>
    );
}
