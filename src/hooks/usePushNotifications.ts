import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const { user } = useAuth();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('[Push] Erro ao checar subscription:', error);
        }
    };

    const subscribe = async () => {
        if (!user) {
            console.error('[Push] Usuário não autenticado');
            return false;
        }

        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // Requisita permissão (isso pode abrir um prompt nativo)
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.log('[Push] Permissão negada.');
                return false;
            }

            // Pega a chave pública do VAPID
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                throw new Error('VAPID public key not configured');
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            // Inscreve
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Envia para o backend salvar no banco
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription,
                    userId: user.id
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar subscription no servidor');
            }

            setIsSubscribed(true);
            return true;
        } catch (error) {
            console.error('[Push] Erro durante o subscribe:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Delete do servidor
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });

                // Delete local
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            return true;
        } catch (error) {
            console.error('[Push] Erro durante unsubscribe:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        isSupported,
        isSubscribed,
        loading,
        subscribe,
        unsubscribe
    };
}
