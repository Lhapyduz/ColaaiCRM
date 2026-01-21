'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheck, FiX, FiChevronDown, FiChevronUp, FiShoppingBag, FiTruck, FiBarChart2, FiUsers, FiGift, FiTag, FiPackage, FiCreditCard, FiSmartphone, FiSettings, FiStar, FiZap, FiShield, FiHeadphones } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

type BillingPeriod = 'monthly' | 'annual';
interface PlanFeature { name: string; basic: boolean | string; professional: boolean | string; enterprise: boolean | string; }
interface FAQ { question: string; answer: string; }

const features: PlanFeature[] = [
    { name: 'Dashboard em Tempo Real', basic: true, professional: true, enterprise: true },
    { name: 'Gestão de Pedidos', basic: true, professional: true, enterprise: true },
    { name: 'Produtos', basic: 'Até 30', professional: 'Até 100', enterprise: 'Ilimitado' },
    { name: 'Categorias', basic: 'Até 5', professional: 'Até 15', enterprise: 'Ilimitado' },
    { name: 'Caixa (Resumo do Dia)', basic: true, professional: true, enterprise: true },
    { name: 'Contas a Pagar/Receber', basic: false, professional: true, enterprise: true },
    { name: 'Fluxo de Caixa', basic: false, professional: true, enterprise: true },
    { name: 'Adicionais de Produtos', basic: false, professional: true, enterprise: true },
    { name: 'Histórico de Ações', basic: false, professional: true, enterprise: true },
    { name: 'Tela de Cozinha', basic: false, professional: true, enterprise: true },
    { name: 'Gestão de Entregas', basic: false, professional: true, enterprise: true },
    { name: 'Controle de Estoque', basic: false, professional: true, enterprise: true },
    { name: 'Programa de Fidelidade', basic: false, professional: true, enterprise: true },
    { name: 'Cupons de Desconto', basic: false, professional: false, enterprise: true },
    { name: 'Relatórios', basic: 'Básico', professional: 'Avançado', enterprise: 'Completo' },
    { name: 'Exportação PDF', basic: false, professional: true, enterprise: true },
    { name: 'Previsão de Vendas (IA)', basic: false, professional: false, enterprise: true },
    { name: 'Funcionários', basic: '1', professional: '5', enterprise: 'Ilimitado' },
    { name: 'Cardápio Online', basic: false, professional: true, enterprise: true },
    { name: 'Personalização', basic: 'Básica', professional: 'Completa', enterprise: 'Completa' },
    { name: 'Suporte', basic: 'Email', professional: 'Email + Chat', enterprise: 'Prioritário 24/7' },
];

const faqs: FAQ[] = [
    { question: 'Posso testar antes de assinar?', answer: 'Sim! Oferecemos 3 dias de teste grátis em todos os planos, sem necessidade de cartão de crédito. Você terá acesso a todas as funcionalidades do plano escolhido.' },
    { question: 'Como funciona a cobrança?', answer: 'A cobrança é feita de forma recorrente via cartão de crédito, boleto ou PIX. Você pode cancelar a qualquer momento, sem multas ou taxas adicionais.' },
    { question: 'Posso mudar de plano depois?', answer: 'Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. A diferença será calculada proporcionalmente ao tempo restante da assinatura.' },
    { question: 'Meus dados estão seguros?', answer: 'Utilizamos criptografia de ponta a ponta e armazenamos seus dados em servidores seguros da Supabase. Fazemos backups automáticos diários e seguimos as melhores práticas de segurança.' },
    { question: 'Preciso instalar algum programa?', answer: 'Não! O Cola Aí é 100% baseado na nuvem. Você acessa pelo navegador de qualquer dispositivo - computador, tablet ou celular.' },
    { question: 'Vocês oferecem treinamento?', answer: 'Sim! Todos os planos incluem acesso à nossa central de ajuda com tutoriais em vídeo. Nos planos Profissional e Enterprise, oferecemos sessões de treinamento ao vivo.' }
];

const testimonials = [
    { name: 'Carlos Silva', business: 'Hot Dog do Carlão', avatar: '👨‍🍳', text: 'Desde que comecei a usar o Cola Aí, meu faturamento aumentou 40%. A organização dos pedidos é impecável!', rating: 5 },
    { name: 'Maria Santos', business: 'Lanchonete da Maria', avatar: '👩‍💼', text: 'O programa de fidelidade fez meus clientes voltarem muito mais. Já tenho mais de 200 clientes cadastrados!', rating: 5 },
    { name: 'João Pereira', business: 'Burger House', avatar: '👨‍💻', text: 'Os relatórios me ajudam a entender melhor meu negócio. Sei exatamente quais produtos vendem mais.', rating: 5 }
];

const highlights = [
    { icon: <FiShoppingBag />, title: 'Gestão de Pedidos', description: 'Controle completo do fluxo de pedidos, do recebimento à entrega.' },
    { icon: <GiCookingPot />, title: 'Tela de Cozinha', description: 'Visualização em tempo real para sua equipe de preparo.' },
    { icon: <FiTruck />, title: 'Gestão de Entregas', description: 'Acompanhe suas entregas e otimize rotas.' },
    { icon: <FiBarChart2 />, title: 'Relatórios Avançados', description: 'Gráficos e métricas para decisões inteligentes.' },
    { icon: <FiGift />, title: 'Programa de Fidelidade', description: '4 níveis de recompensas para fidelizar clientes.' },
    { icon: <FiTag />, title: 'Cupons de Desconto', description: 'Crie promoções e atraia mais clientes.' },
    { icon: <FiPackage />, title: 'Controle de Estoque', description: 'Alertas de estoque baixo e controle de ingredientes.' },
    { icon: <FiSmartphone />, title: 'Cardápio Online', description: 'Seus clientes fazem pedidos pelo celular.' },
    { icon: <FiCreditCard />, title: 'Múltiplos Pagamentos', description: 'Aceite PIX, cartão, dinheiro e muito mais.' },
    { icon: <FiUsers />, title: 'Multi-funcionários', description: 'Gerencie sua equipe com diferentes acessos.' },
    { icon: <FiSettings />, title: 'Personalização Total', description: 'Sua marca, suas cores, seu logo.' },
    { icon: <FiZap />, title: 'Previsão de Vendas', description: 'IA que prevê suas vendas do dia.' }
];

export default function VendasPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const prices = { basic: { monthly: 49, annual: 490 }, professional: { monthly: 79, annual: 790 }, enterprise: { monthly: 149, annual: 1490 } };
    const getMonthlyPrice = (plan: 'basic' | 'professional' | 'enterprise') => billingPeriod === 'annual' ? (prices[plan].annual / 12).toFixed(2).replace('.', ',') : prices[plan].monthly.toString();
    const renderFeatureValue = (value: boolean | string) => typeof value === 'boolean' ? (value ? <FiCheck className="text-success" /> : <FiX className="text-error" />) : <span className="text-sm text-text-muted">{value}</span>;

    const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": "https://colaai.com.br/#organization", "name": "Cola Aí", "url": "https://colaai.com.br", "logo": { "@type": "ImageObject", "url": "https://colaai.com.br/logo.png" } }, { "@type": "WebSite", "@id": "https://colaai.com.br/#website", "url": "https://colaai.com.br", "name": "Cola Aí", "publisher": { "@id": "https://colaai.com.br/#organization" } }, { "@type": "SoftwareApplication", "name": "Cola Aí", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": { "@type": "AggregateOffer", "priceCurrency": "BRL", "lowPrice": "49", "highPrice": "149", "offerCount": "3" }, "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "ratingCount": "3", "bestRating": "5", "worstRating": "1" } }, { "@type": "FAQPage", "mainEntity": faqs.map(faq => ({ "@type": "Question", "name": faq.question, "acceptedAnswer": { "@type": "Answer", "text": faq.answer } })) }] };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none"><div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] rounded-full bg-primary/30 blur-[150px]" /><div className="absolute bottom-[-30%] right-[-20%] w-[700px] h-[700px] rounded-full bg-accent/30 blur-[150px]" /></div>
                    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                        <div className="mb-8"><Image src="/logo-colaai.webp" alt="Cola Aí - Sistema para Lanchonetes" width={280} height={120} priority className="mx-auto" /></div>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6"><FiZap /> Sistema #1 para Lanchonetes</span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">Transforme sua <span className="text-primary">Lanchonete</span> em uma Máquina de Vendas</h1>
                        <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto">O sistema completo para gerenciar pedidos, fidelizar clientes e aumentar seu faturamento. Tudo em um só lugar, sem complicação.</p>
                        <div className="flex flex-wrap gap-4 justify-center mb-10">
                            <Link href="/assinatura" className="px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-hover transition-all shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5">Começar Agora - 3 Dias Grátis</Link>
                            <Link href="/menu" className="px-8 py-4 bg-bg-tertiary text-text-primary rounded-lg font-semibold text-lg border border-border hover:border-primary transition-all flex items-center gap-2">Ver Demo <FiChevronDown /></Link>
                        </div>
                        <div className="flex justify-center gap-8 md:gap-12">{[['3 dias', 'Teste Grátis'], ['100%', 'Online'], ['0', 'Instalação']].map(([num, label]) => <div key={label} className="text-center"><span className="block text-2xl font-bold text-primary">{num}</span><span className="text-sm text-text-muted">{label}</span></div>)}</div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-20 px-4">
                    <div className="max-w-6xl mx-auto"><div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">Tudo que você precisa para crescer</h2><p className="text-text-secondary">Mais de 20 funcionalidades pensadas para o dia a dia do seu negócio</p></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{highlights.map((f, i) => <div key={i} className="bg-bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all group"><div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div><h3 className="font-semibold mb-2">{f.title}</h3><p className="text-sm text-text-muted">{f.description}</p></div>)}</div></div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-20 px-4 bg-bg-card">
                    <div className="max-w-6xl mx-auto"><div className="text-center mb-8"><h2 className="text-3xl font-bold mb-4">Escolha o plano ideal para você</h2><p className="text-text-secondary">Comece grátis por 3 dias. Cancele quando quiser.</p></div>
                        <div className="flex justify-center mb-10"><div className="inline-flex bg-bg-tertiary p-1 rounded-lg"><button className={cn('px-6 py-2 rounded-md font-medium transition-all', billingPeriod === 'monthly' && 'bg-primary text-white')} onClick={() => setBillingPeriod('monthly')}>Mensal</button><button className={cn('px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2', billingPeriod === 'annual' && 'bg-primary text-white')} onClick={() => setBillingPeriod('annual')}>Anual <span className="text-xs px-2 py-0.5 bg-success text-white rounded-full">2 Meses Grátis</span></button></div></div>
                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {/* Basic */}
                            <div className="bg-bg-tertiary border border-border rounded-xl p-6"><h3 className="text-xl font-bold mb-1">Básico</h3><p className="text-sm text-text-muted mb-4">Para quem está começando</p><div className="mb-4"><span className="text-sm text-text-muted">R$</span><span className="text-4xl font-bold">{getMonthlyPrice('basic')}</span><span className="text-text-muted">/mês</span></div>{billingPeriod === 'annual' && <p className="text-xs text-text-muted mb-4">Cobrado {formatCurrency(prices.basic.annual)} anualmente</p>}<ul className="space-y-2 mb-6 text-sm">{['Dashboard em tempo real', 'Gestão de pedidos', 'Até 30 produtos', 'Até 5 categorias', 'Relatórios básicos', 'Suporte por email'].map(f => <li key={f} className="flex items-center gap-2"><FiCheck className="text-success shrink-0" />{f}</li>)}</ul><Link href="/assinatura" className="block text-center w-full py-3 rounded-lg border border-border hover:border-primary transition-all font-medium">Começar Grátis</Link></div>
                            {/* Professional */}
                            <div className="bg-bg-tertiary border-2 border-primary rounded-xl p-6 relative"><div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full">Mais Popular</div><h3 className="text-xl font-bold mb-1 mt-2">Avançado</h3><p className="text-sm text-text-muted mb-4">Para negócios em crescimento</p><div className="mb-4"><span className="text-sm text-text-muted">R$</span><span className="text-4xl font-bold">{getMonthlyPrice('professional')}</span><span className="text-text-muted">/mês</span></div>{billingPeriod === 'annual' && <p className="text-xs text-text-muted mb-4">Cobrado {formatCurrency(prices.professional.annual)} anualmente</p>}<ul className="space-y-2 mb-6 text-sm">{['Tudo do Básico +', 'Até 100 produtos', 'Tela de cozinha', 'Gestão de entregas', 'Controle de estoque', 'Programa de fidelidade', 'Cardápio Online', 'Relatórios avançados', 'Até 5 funcionários', 'Suporte via chat'].map(f => <li key={f} className="flex items-center gap-2"><FiCheck className="text-success shrink-0" />{f}</li>)}</ul><Link href="/assinatura" className="block text-center w-full py-3 rounded-lg bg-primary text-white hover:bg-primary-hover transition-all font-medium">Começar Grátis</Link></div>
                            {/* Enterprise */}
                            <div className="bg-bg-tertiary border border-border rounded-xl p-6"><h3 className="text-xl font-bold mb-1">Profissional</h3><p className="text-sm text-text-muted mb-4">Para operações maiores</p><div className="mb-4"><span className="text-sm text-text-muted">R$</span><span className="text-4xl font-bold">{getMonthlyPrice('enterprise')}</span><span className="text-text-muted">/mês</span></div>{billingPeriod === 'annual' && <p className="text-xs text-text-muted mb-4">Cobrado {formatCurrency(prices.enterprise.annual)} anualmente</p>}<ul className="space-y-2 mb-6 text-sm">{['Tudo do Avançado +', 'Produtos ilimitados', 'Cupons de desconto', 'Previsão de vendas (IA)', 'Funcionários ilimitados', 'Relatórios completos', 'Suporte prioritário 24/7'].map(f => <li key={f} className="flex items-center gap-2"><FiCheck className="text-success shrink-0" />{f}</li>)}</ul><Link href="/assinatura" className="block text-center w-full py-3 rounded-lg border border-border hover:border-primary transition-all font-medium">Começar Grátis</Link></div>
                        </div>
                        {/* Comparison Table */}
                        <div className="mt-16 max-w-5xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">Comparativo Completo</h3><div className="bg-bg-tertiary rounded-xl overflow-hidden border border-border"><div className="grid grid-cols-4 bg-background p-4 font-semibold text-sm"><div>Recurso</div><div className="text-center">Básico</div><div className="text-center">Avançado</div><div className="text-center">Profissional</div></div>{features.map((f, i) => <div key={i} className="grid grid-cols-4 p-4 border-t border-border text-sm hover:bg-bg-card/50"><div>{f.name}</div><div className="text-center">{renderFeatureValue(f.basic)}</div><div className="text-center">{renderFeatureValue(f.professional)}</div><div className="text-center">{renderFeatureValue(f.enterprise)}</div></div>)}</div></div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-20 px-4">
                    <div className="max-w-5xl mx-auto"><div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">O que nossos clientes dizem</h2><p className="text-text-secondary">Mais de 500 negócios já transformaram suas operações</p></div>
                        <div className="grid md:grid-cols-3 gap-6">{testimonials.map((t, i) => <div key={i} className="bg-bg-card border border-border rounded-xl p-6"><div className="flex gap-1 mb-4 text-warning">{[...Array(t.rating)].map((_, j) => <FiStar key={j} className="fill-current" />)}</div><p className="text-text-secondary mb-4">"{t.text}"</p><div className="flex items-center gap-3"><span className="text-3xl">{t.avatar}</span><div><span className="block font-semibold">{t.name}</span><span className="text-sm text-text-muted">{t.business}</span></div></div></div>)}</div></div>
                </section>

                {/* Trust Badges */}
                <section className="py-16 px-4 bg-bg-card">
                    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">{[{ icon: <FiShield />, title: 'Dados Seguros', desc: 'Criptografia de ponta a ponta' }, { icon: <FiZap />, title: '99.9% Uptime', desc: 'Sistema sempre disponível' }, { icon: <FiHeadphones />, title: 'Suporte Humano', desc: 'Atendimento real, sem robôs' }].map((t, i) => <div key={i}><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl">{t.icon}</div><h4 className="font-semibold mb-1">{t.title}</h4><p className="text-sm text-text-muted">{t.desc}</p></div>)}</div>
                </section>

                {/* FAQ */}
                <section className="py-20 px-4">
                    <div className="max-w-3xl mx-auto"><div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2><p className="text-text-secondary">Tire suas dúvidas sobre o Cola Aí</p></div>
                        <div className="space-y-3">{faqs.map((faq, i) => <div key={i} className="bg-bg-card border border-border rounded-lg overflow-hidden"><button className="w-full flex justify-between items-center p-4 text-left font-medium hover:bg-bg-tertiary transition-all" onClick={() => setOpenFaq(openFaq === i ? null : i)}><span>{faq.question}</span>{openFaq === i ? <FiChevronUp /> : <FiChevronDown />}</button><div className={cn('overflow-hidden transition-all', openFaq === i ? 'max-h-40 p-4 pt-0' : 'max-h-0')}><p className="text-text-secondary text-sm">{faq.answer}</p></div></div>)}</div></div>
                </section>

                {/* Final CTA */}
                <section className="py-20 px-4 bg-linear-to-r from-primary/20 to-accent/20">
                    <div className="max-w-2xl mx-auto text-center"><h2 className="text-3xl font-bold mb-4">Pronto para turbinar seu negócio?</h2><p className="text-text-secondary mb-8">Comece seus 3 dias grátis agora. Sem cartão de crédito.</p><Link href="/assinatura" className="inline-block px-10 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-hover transition-all shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5">Começar Agora - É Grátis!</Link></div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-4 border-t border-border">
                    <div className="max-w-4xl mx-auto text-center"><Image src="/logo-colaai.webp" alt="Cola Aí" width={150} height={65} className="mx-auto mb-6" /><div className="flex justify-center gap-4 mb-4 text-sm"><Link href="/termos" className="text-text-muted hover:text-primary">Termos de Uso</Link><span className="text-border">|</span><Link href="/privacidade" className="text-text-muted hover:text-primary">Política de Privacidade</Link></div><p className="text-sm text-text-muted">© 2026 Cola Aí. Todos os direitos reservados.</p></div>
                </footer>
            </div>
        </>
    );
}
