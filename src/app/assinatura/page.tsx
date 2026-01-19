'use client';

import React, { useState } from 'react';
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSubscription, PlanType } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import PixPaymentModal from '@/components/pix/PixPaymentModal';
import { PLAN_PRICES, PlanPriceKey } from '@/lib/pix-config';
import styles from './page.module.css';

const PLANS = [
    {
        id: 'Basico' as PlanType,
        name: 'Básico',
        price: 'R$ 49,00',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
        features: [
            { name: 'Dashboard em Tempo Real', included: true },
            { name: 'Gestão de Pedidos', included: true },
            { name: 'Até 30 Produtos', included: true },
            { name: 'Até 5 Categorias', included: true },
            { name: 'Relatórios Básicos', included: true },
            { name: 'Suporte por Email', included: true },
            { name: 'Cardápio Online', included: false },
            { name: 'Gestão de Cozinha', included: false },
        ]
    },
    {
        id: 'Avançado' as PlanType,
        name: 'Avançado',
        price: 'R$ 79,00',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL,
        recommended: true,
        features: [
            { name: 'Tudo do Básico +', included: true },
            { name: 'Até 100 Produtos', included: true },
            { name: 'Tela de Cozinha', included: true },
            { name: 'Gestão de Entregas', included: true },
            { name: 'Controle de Estoque', included: true },
            { name: 'Programa de Fidelidade', included: true },
            { name: 'Cardápio Online', included: true },
            { name: 'Até 5 Funcionários', included: true },
        ]
    },
    {
        id: 'Profissional' as PlanType,
        name: 'Profissional',
        price: 'R$ 149,00',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
        features: [
            { name: 'Tudo do Avançado +', included: true },
            { name: 'Produtos Ilimitados', included: true },
            { name: 'Cupons de Desconto', included: true },
            { name: 'Previsão de Vendas (IA)', included: true },
            { name: 'Funcionários Ilimitados', included: true },
            { name: 'Relatórios Completos', included: true },
            { name: 'Suporte Prioritário 24/7', included: true },
        ]
    }
];

type PaymentMethod = 'card' | 'pix';

const AssinaturaPage = () => {
    const { subscription, loading, refreshSubscription } = useSubscription();
    const { user } = useAuth();
    const router = useRouter();
    const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [pixModalPlan, setPixModalPlan] = useState<{ type: PlanPriceKey; name: string } | null>(null);
    const [pixLoading, setPixLoading] = useState(false);

    // Sync with Stripe on page load and on return from checkout or portal
    React.useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('success') === 'true' || query.get('portal') === 'true') {
            handleSync();
        } else {
            // Always sync with Stripe on mount to get latest status/dates
            handleAutoSync();
        }
    }, []);

    // Automatic sync that doesn't show loading state (for background updates)
    const handleAutoSync = async () => {
        try {
            // First refresh from database
            await refreshSubscription();

            // Then try to sync with Stripe in background (only if user has subscription)
            const res = await fetch('/api/stripe/sync', { method: 'POST' });
            if (res.ok) {
                // Refresh again after sync to show updated data
                await refreshSubscription();
            }
        } catch (error) {
            console.error('Auto sync failed:', error);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await fetch('/api/stripe/sync', { method: 'POST' });
            if (res.ok) {
                await refreshSubscription();
                // Clear the query param
                window.history.replaceState({}, '', '/assinatura');
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleSubscribe = async (priceId: string | undefined, planType: string) => {
        if (!user) {
            router.push('/login?redirect=/assinatura');
            return;
        }

        if (!priceId) {
            console.error('Missing Price ID for plan:', planType);
            alert('Configuração de preço ausente. Verifique o console.');
            return;
        }

        setLoadingCheckout(planType);

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId,
                    planType,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falha ao iniciar checkout');
            }

            const { url } = await response.json();
            window.location.href = url;
        } catch (error: any) {
            console.error('Error:', error);
            alert(`Erro ao iniciar pagamento: ${error.message}`);
            setLoadingCheckout(null);
        }
    };

    const handleManageSubscription = async () => {
        setLoadingPortal(true);
        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falha ao abrir portal');
            }

            const { url } = await response.json();
            window.location.href = url;
        } catch (error: any) {
            console.error('Error:', error);
            alert(`Erro ao abrir o portal: ${error.message}`);
            setLoadingPortal(false);
        }
    };

    const handlePixSubscribe = (planType: PlanPriceKey, planName: string) => {
        if (!user) {
            router.push('/login?redirect=/assinatura');
            return;
        }
        setPixModalPlan({ type: planType, name: planName });
    };

    const handlePixPaymentConfirmed = async () => {
        if (!pixModalPlan) return;

        setPixLoading(true);
        try {
            const response = await fetch('/api/pix/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planType: pixModalPlan.type,
                    amount: PLAN_PRICES[pixModalPlan.type]
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falha ao processar pagamento Pix');
            }

            const data = await response.json();
            alert(data.message);
            await refreshSubscription();
            setPixModalPlan(null);
        } catch (error: any) {
            console.error('Pix payment error:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            setPixLoading(false);
        }
    };

    // Helper to get status label - includes plan name for trial status
    const getStatusLabel = (status: string, planType?: string) => {
        switch (status) {
            case 'active': return { label: 'Ativa', class: styles.statusActive };
            case 'trial':
            case 'trialing':
                const planName = PLANS.find(p => p.id === planType)?.name || planType;
                return { label: `Período de Teste - ${planName}`, class: styles.statusTrial };
            case 'cancelled': return { label: 'Cancelada', class: styles.statusCancelled };
            case 'expired': return { label: 'Expirada', class: styles.statusCancelled };
            default: return { label: status, class: '' };
        }
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Planos e Assinatura</h1>
                    <p className={styles.subtitle}>Escolha o plano ideal para o seu negócio crescer</p>
                </div>

                {subscription && (
                    <div className={styles.manageContainer} style={{ marginBottom: '2rem' }}>
                        <h3>Sua Assinatura Atual</h3>
                        <div style={{ margin: '1rem 0' }}>
                            <span className={`${styles.statusBadge} ${getStatusLabel(subscription.status, subscription.plan_type).class}`}>
                                {getStatusLabel(subscription.status, subscription.plan_type).label}
                            </span>
                            <p>Plano: <strong>{PLANS.find(p => p.id === subscription.plan_type)?.name || subscription.plan_type}</strong></p>
                            {(subscription.stripe_current_period_end || subscription.current_period_end) && (
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                    Renova em: {new Date(subscription.stripe_current_period_end || subscription.current_period_end).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleManageSubscription}
                            isLoading={loadingPortal}
                            leftIcon={<FiCreditCard />}
                        >
                            Gerenciar Assinatura
                        </Button>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSync}
                                isLoading={syncing}
                            >
                                Sincronizar Status
                            </Button>
                            {syncing && <span style={{ fontSize: '0.8rem', color: '#666' }}>Atualizando...</span>}
                        </div>
                    </div>
                )}
                {/* Payment Method Toggle */}
                <div className={styles.paymentToggle}>
                    <span className={styles.paymentToggleLabel}>Forma de pagamento:</span>
                    <div className={styles.paymentOptions}>
                        <button
                            className={`${styles.paymentOption} ${paymentMethod === 'card' ? styles.paymentOptionActive : ''}`}
                            onClick={() => setPaymentMethod('card')}
                        >
                            <FiCreditCard />
                            Cartão de Crédito
                        </button>
                        <button
                            className={`${styles.paymentOption} ${paymentMethod === 'pix' ? styles.paymentOptionActive : ''}`}
                            onClick={() => setPaymentMethod('pix')}
                        >
                            <svg viewBox="0 0 512 512" fill="currentColor" width="16" height="16">
                                <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.9 231.1 518.9 200.8 488.6L103.3 391.1H117.4C137.5 391.1 156.3 383.3 170.5 369.1L242.4 292.5zM262.5 218.9C257.1 224.4 247.9 224.5 242.4 218.9L170.5 142C156.3 127.8 137.4 119.1 117.4 119.1H103.3L200.8 22.51C231.1-7.86 280.3-7.86 310.6 22.51L407.8 119.1H392.7C372.6 119.1 353.8 127.8 339.6 142L262.5 218.9z" />
                            </svg>
                            PIX
                        </button>
                    </div>
                    {paymentMethod === 'pix' && (
                        <p className={styles.pixNote}>
                            Pagamento via PIX direto. Assinatura ativada em até 24h após confirmação.
                        </p>
                    )}
                </div>

                <div className={styles.plansGrid}>
                    {PLANS.map((plan) => {
                        const isCurrentPlan = subscription?.plan_type === plan.id && subscription?.status === 'active';

                        return (
                            <div
                                key={plan.id}
                                className={`${styles.planCard} ${plan.recommended ? styles.featured : ''}`}
                            >
                                {plan.recommended && <div className={styles.popularTag}>Mais Popular</div>}

                                <h3 className={styles.planName}>{plan.name}</h3>
                                <div className={styles.planPrice}>
                                    {plan.price}
                                    <span className={styles.planPeriod}>{plan.period}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#2ecc71', marginBottom: '1rem', fontWeight: 500 }}>
                                    3 dias de teste grátis
                                </div>

                                <div className={styles.featuresList}>
                                    {plan.features.map((feature, index) => (
                                        <div key={index} className={styles.featureItem} style={{ opacity: feature.included ? 1 : 0.5 }}>
                                            {feature.included ? (
                                                <FiCheck className={styles.checkIcon} />
                                            ) : (
                                                <FiX className={styles.closeIcon} />
                                            )}
                                            <span style={{ textDecoration: feature.included ? 'none' : 'line-through' }}>
                                                {feature.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {isCurrentPlan ? (
                                    <div className={styles.currentPlan}>Seu Plano Atual</div>
                                ) : paymentMethod === 'pix' ? (
                                    <Button
                                        variant={plan.recommended ? 'primary' : 'outline'}
                                        onClick={() => handlePixSubscribe(plan.id as PlanPriceKey, plan.name)}
                                        disabled={!!loadingCheckout}
                                    >
                                        {subscription ? 'Mudar Plano' : 'Pagar com PIX'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant={plan.recommended ? 'primary' : 'outline'}
                                        onClick={() => handleSubscribe(plan.priceId, plan.id)}
                                        isLoading={loadingCheckout === plan.id}
                                        disabled={!!loadingCheckout}
                                    >
                                        {subscription ? 'Mudar Plano' : 'Assinar Agora'}
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pix Payment Modal */}
            {
                pixModalPlan && (
                    <PixPaymentModal
                        planType={pixModalPlan.type}
                        planName={pixModalPlan.name}
                        onClose={() => setPixModalPlan(null)}
                        onPaymentConfirmed={handlePixPaymentConfirmed}
                        isLoading={pixLoading}
                    />
                )
            }
        </MainLayout >
    );
}

export default AssinaturaPage;
