'use client';

import React, { useState } from 'react';
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSubscription, PlanType } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanPrice, BillingPeriod, PlanPriceKey } from '@/lib/pix-config';
import PixPaymentModal from '@/components/pix/PixPaymentModal';
import { cn } from '@/lib/utils';

const PLANS = [
    { id: 'Basico' as PlanType, name: 'Básico', priceMonthly: 49, priceAnnual: 490, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC, features: [{ name: 'Dashboard em Tempo Real', included: true }, { name: 'Gestão de Pedidos', included: true }, { name: 'Até 25 Produtos', included: true }, { name: 'Até 5 Categorias', included: true }, { name: 'Até 5 Adicionais', included: true }, { name: 'Suporte por Email', included: true }, { name: 'Relatórios', included: false }, { name: 'Cardápio Online', included: false }, { name: 'Gestão de Cozinha', included: false }] },
    { id: 'Avançado' as PlanType, name: 'Avançado', priceMonthly: 79, priceAnnual: 790, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL, recommended: true, features: [{ name: 'Tudo do Básico +', included: true }, { name: 'Até 100 Produtos', included: true }, { name: 'Tela de Cozinha', included: true }, { name: 'Gestão de Entregas', included: true }, { name: 'Controle de Estoque', included: true }, { name: 'Programa de Fidelidade', included: true }, { name: 'Cardápio Online', included: true }, { name: 'Até 5 Funcionários', included: true }] },
    { id: 'Profissional' as PlanType, name: 'Profissional', priceMonthly: 149, priceAnnual: 1490, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE, features: [{ name: 'Tudo do Avançado +', included: true }, { name: 'Produtos Ilimitados', included: true }, { name: 'Cupons de Desconto', included: true }, { name: 'Previsão de Vendas (IA)', included: true }, { name: 'Funcionários Ilimitados', included: true }, { name: 'Relatórios Completos', included: true }, { name: 'Suporte Prioritário 24/7', included: true }] }
];

type PaymentMethod = 'card' | 'pix';

const AssinaturaPage = () => {
    const { subscription, loading, refreshSubscription } = useSubscription();
    const { user } = useAuth();
    const router = useRouter();
    const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [pixModalData, setPixModalData] = useState<{ planType: PlanPriceKey, planName: string } | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

    React.useEffect(() => { const query = new URLSearchParams(window.location.search); if (query.get('success') === 'true' || query.get('portal') === 'true') handleSync(); else handleAutoSync(); }, []);

    const handleAutoSync = async () => { try { await refreshSubscription(); const res = await fetch('/api/stripe/sync', { method: 'POST' }); if (res.ok) await refreshSubscription(); } catch (e) { console.error(e); } };
    const handleSync = async () => { try { setSyncing(true); const res = await fetch('/api/stripe/sync', { method: 'POST' }); if (res.ok) { await refreshSubscription(); window.history.replaceState({}, '', '/assinatura'); } } catch (e) { console.error(e); } finally { setSyncing(false); } };

    const handleSubscribe = async (priceId: string | undefined, planType: string) => { if (!user) { router.push('/login?redirect=/assinatura'); return; } if (!priceId) { alert('Configuração de preço ausente.'); return; } setLoadingCheckout(planType); try { const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceId, planType }) }); if (!response.ok) throw new Error(await response.text() || 'Falha ao iniciar checkout'); const { url } = await response.json(); window.location.href = url; } catch (error: any) { alert(`Erro ao iniciar pagamento: ${error.message}`); setLoadingCheckout(null); } };
    const handleManageSubscription = async () => { setLoadingPortal(true); try { const response = await fetch('/api/stripe/portal', { method: 'POST' }); if (!response.ok) throw new Error(await response.text() || 'Falha ao abrir portal'); const { url } = await response.json(); window.location.href = url; } catch (error: any) { alert(`Erro ao abrir o portal: ${error.message}`); setLoadingPortal(false); } };

    // Fluxo PIX Manual - Abre o modal com QR Code
    const handlePixSubscribe = async (planType: PlanPriceKey) => {
        if (!user) {
            router.push('/login?redirect=/assinatura');
            return;
        }

        const plan = PLANS.find(p => p.id === planType);
        if (!plan) return;

        setPixModalData({
            planType,
            planName: plan.name
        });
    };

    const getStatusLabel = (status: string, planType?: string) => {
        const planName = PLANS.find(p => p.id === planType)?.name || planType;
        if (status === 'active') return { label: 'Ativa', className: 'bg-[#27ae60]/20 text-[#27ae60]' };
        if (status === 'trial' || status === 'trialing') return { label: `Período de Teste - ${planName}`, className: 'bg-[#f39c12]/20 text-[#f39c12]' };
        if (status === 'cancelled' || status === 'expired') return { label: status === 'cancelled' ? 'Cancelada' : 'Expirada', className: 'bg-[#e74c3c]/20 text-[#e74c3c]' };
        if (status === 'pending_pix') return { label: 'Aguardando PIX', className: 'bg-[#3498db]/20 text-[#3498db]' };
        return { label: status, className: 'bg-bg-tertiary text-text-secondary' };
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getPrice = (plan: typeof PLANS[0]) => {
        return billingPeriod === 'annual' ? plan.priceAnnual : plan.priceMonthly;
    };

    const getPriceLabel = (plan: typeof PLANS[0]) => {
        if (billingPeriod === 'annual') {
            const monthlyEquivalent = plan.priceAnnual / 12;
            return (
                <div className="text-center my-4">
                    <span className="text-3xl font-bold text-primary">{formatCurrency(plan.priceAnnual)}</span>
                    <span className="text-text-muted">/ano</span>
                    <p className="text-xs text-text-muted mt-1">({formatCurrency(monthlyEquivalent)}/mês)</p>
                </div>
            );
        }
        return (
            <div className="text-center my-4">
                <span className="text-3xl font-bold text-primary">{formatCurrency(plan.priceMonthly)}</span>
                <span className="text-text-muted">/mês</span>
            </div>
        );
    };

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-8"><h1 className="text-[2rem] font-bold mb-2">Planos e Assinatura</h1><p className="text-text-secondary">Escolha o plano ideal para o seu negócio crescer</p></div>

            {subscription && (
                <div className="bg-bg-card border border-border rounded-lg p-6 mb-8 text-center">
                    <h3 className="text-lg font-semibold mb-4">Sua Assinatura Atual</h3>
                    <div className="mb-4"><span className={cn('inline-block px-3 py-1.5 rounded-full text-sm font-medium', getStatusLabel(subscription.status, subscription.plan_type).className)}>{getStatusLabel(subscription.status, subscription.plan_type).label}</span><p className="mt-2">Plano: <strong>{PLANS.find(p => p.id === subscription.plan_type)?.name || subscription.plan_type}</strong></p>{(subscription.stripe_current_period_end || subscription.current_period_end) && <p className="text-sm text-text-muted">Renova em: {new Date(subscription.stripe_current_period_end || subscription.current_period_end).toLocaleDateString()}</p>}</div>
                    <Button variant="outline" onClick={handleManageSubscription} isLoading={loadingPortal} leftIcon={<FiCreditCard />}>Gerenciar Assinatura</Button>
                    <div className="mt-4 flex justify-center items-center gap-4"><Button variant="ghost" size="sm" onClick={handleSync} isLoading={syncing}>Sincronizar Status</Button>{syncing && <span className="text-xs text-text-muted">Atualizando...</span>}</div>
                </div>
            )}

            {/* Payment Method Toggle */}
            <div className="flex flex-col items-center mb-6">
                <span className="text-sm text-text-secondary mb-2">Forma de pagamento:</span>
                <div className="flex gap-2 bg-bg-tertiary p-1 rounded-md">
                    <button className={cn('flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all', paymentMethod === 'card' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')} onClick={() => setPaymentMethod('card')}><FiCreditCard /> Cartão de Crédito</button>
                    <button className={cn('flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all', paymentMethod === 'pix' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')} onClick={() => setPaymentMethod('pix')}><svg viewBox="0 0 512 512" fill="currentColor" width="16" height="16"><path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.9 231.1 518.9 200.8 488.6L103.3 391.1H117.4C137.5 391.1 156.3 383.3 170.5 369.1L242.4 292.5zM262.5 218.9C257.1 224.4 247.9 224.5 242.4 218.9L170.5 142C156.3 127.8 137.4 119.1 117.4 119.1H103.3L200.8 22.51C231.1-7.86 280.3-7.86 310.6 22.51L407.8 119.1H392.7C372.6 119.1 353.8 127.8 339.6 142L262.5 218.9z" /></svg> PIX</button>
                </div>
            </div>

            {/* Billing Period Toggle - Only for PIX */}
            {paymentMethod === 'pix' && (
                <div className="flex flex-col items-center mb-8">
                    <span className="text-sm text-text-secondary mb-2">Período de cobrança:</span>
                    <div className="flex gap-2 bg-bg-tertiary p-1 rounded-md">
                        <button className={cn('px-4 py-2 rounded text-sm font-medium transition-all', billingPeriod === 'monthly' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')} onClick={() => setBillingPeriod('monthly')}>Mensal</button>
                        <button className={cn('relative px-4 py-2 rounded text-sm font-medium transition-all', billingPeriod === 'annual' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')} onClick={() => setBillingPeriod('annual')}>
                            Anual
                            <span className="absolute -top-2 -right-2 bg-[#27ae60] text-white text-[10px] px-1.5 py-0.5 rounded-full">2 meses grátis</span>
                        </button>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                        {billingPeriod === 'annual'
                            ? 'Pague 10 meses e ganhe 2 meses grátis!'
                            : 'Pagamento via PIX com QR Code. Acesso liberado automaticamente.'}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
                {PLANS.map((plan) => {
                    const isCurrentPlan = subscription?.plan_type === plan.id && subscription?.status === 'active';
                    return (
                        <div key={plan.id} className={cn('relative bg-bg-card border border-border rounded-lg p-6 flex flex-col transition-all duration-normal hover:border-primary/50', plan.recommended && 'border-primary ring-2 ring-primary/20')}>
                            {plan.recommended && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full">Mais Popular</div>}
                            <h3 className="text-xl font-bold text-center mt-2">{plan.name}</h3>
                            {getPriceLabel(plan)}
                            {paymentMethod === 'card' && <div className="text-center text-xs text-[#2ecc71] font-medium mb-4">3 dias de teste grátis</div>}
                            {paymentMethod === 'pix' && billingPeriod === 'annual' && (
                                <div className="text-center text-xs text-[#27ae60] font-medium mb-4">Economize {formatCurrency(plan.priceMonthly * 2)}</div>
                            )}
                            <div className="flex-1 flex flex-col gap-3 mb-6">{plan.features.map((feature, index) => (<div key={index} className={cn('flex items-center gap-2 text-sm', !feature.included && 'opacity-50')}>{feature.included ? <FiCheck className="text-[#27ae60] shrink-0" /> : <FiX className="text-error shrink-0" />}<span className={!feature.included ? 'line-through' : ''}>{feature.name}</span></div>))}</div>
                            {isCurrentPlan ? (
                                <div className="py-3 px-4 bg-bg-tertiary rounded-md text-center text-text-secondary font-medium">Seu Plano Atual</div>
                            ) : paymentMethod === 'pix' ? (
                                <Button
                                    variant={plan.recommended ? 'primary' : 'outline'}
                                    onClick={() => handlePixSubscribe(plan.id as PlanPriceKey)}
                                    isLoading={loadingCheckout === plan.id}
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

            {pixModalData && (
                <PixPaymentModal
                    planType={pixModalData.planType}
                    planName={pixModalData.planName}
                    billingPeriod={billingPeriod}
                    onClose={() => setPixModalData(null)}
                />
            )}
        </div>
    );
}

export default AssinaturaPage;
