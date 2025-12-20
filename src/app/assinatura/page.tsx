'use client';

import React, { useState } from 'react';
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSubscription, PlanType } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const PLANS = [
    {
        id: 'basic' as PlanType,
        name: 'Básico',
        price: 'R$ 49,90',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
        features: [
            { name: 'Dashboard de Vendas', included: true },
            { name: 'Gestão de Pedidos', included: true },
            { name: 'Produtos e Categorias', included: true },
            { name: 'Gestão de Cozinha', included: false },
            { name: 'Gestão de Entregas', included: false },
            { name: 'Controle de Estoque', included: false },
            { name: 'Programa de Fidelidade', included: false },
            { name: 'Múltiplas Lojas', included: false },
        ]
    },
    {
        id: 'professional' as PlanType,
        name: 'Profissional',
        price: 'R$ 79,90',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL,
        recommended: true,
        features: [
            { name: 'Dashboard de Vendas', included: true },
            { name: 'Gestão de Pedidos', included: true },
            { name: 'Produtos e Categorias', included: true },
            { name: 'Gestão de Cozinha', included: true },
            { name: 'Gestão de Entregas', included: true },
            { name: 'Controle de Estoque', included: true },
            { name: 'Programa de Fidelidade', included: true },
            { name: 'Múltiplas Lojas', included: false },
        ]
    },
    {
        id: 'enterprise' as PlanType,
        name: 'Enterprise',
        price: 'R$ 149,90',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
        features: [
            { name: 'Dashboard de Vendas', included: true },
            { name: 'Gestão de Pedidos', included: true },
            { name: 'Produtos e Categorias', included: true },
            { name: 'Gestão de Cozinha', included: true },
            { name: 'Gestão de Entregas', included: true },
            { name: 'Controle de Estoque', included: true },
            { name: 'Programa de Fidelidade', included: true },
            { name: 'Múltiplas Lojas', included: true },
        ]
    }
];

const AssinaturaPage = () => {
    const { subscription, loading, refreshSubscription } = useSubscription();
    const { user } = useAuth();
    const router = useRouter();
    const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Sync with Stripe on return from checkout
    React.useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('success') === 'true') {
            handleSync();
        }
    }, []);

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

    // Helper to get status label
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return { label: 'Ativa', class: styles.statusActive };
            case 'trial': return { label: 'Período de Teste', class: styles.statusTrial };
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
                            <span className={`${styles.statusBadge} ${getStatusLabel(subscription.status).class}`}>
                                {getStatusLabel(subscription.status).label}
                            </span>
                            <p>Plano: <strong>{PLANS.find(p => p.id === subscription.plan_type)?.name || subscription.plan_type}</strong></p>
                            {subscription.current_period_end && (
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                    Renova em: {new Date(subscription.current_period_end).toLocaleDateString()}
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
                                    7 dias de teste grátis
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
        </MainLayout>
    );
}

export default AssinaturaPage;
