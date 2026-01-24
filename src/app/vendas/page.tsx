'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiCheck, FiX, FiChevronDown, FiChevronUp, FiShoppingBag, FiTruck, FiBarChart2,
    FiUsers, FiGift, FiTag, FiPackage, FiCreditCard, FiSmartphone, FiSettings,
    FiStar, FiZap, FiShield, FiHeadphones, FiArrowRight, FiPlay
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ComparisonTable, { PlanFeature } from '@/components/vendas/ComparisonTable';
import PricingCard from '@/components/vendas/PricingCard';

type BillingPeriod = 'monthly' | 'annual';
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
    { icon: <FiShoppingBag />, title: 'Gestão de Pedidos', description: 'Controle centralizado de todas as suas vendas.' },
    { icon: <GiCookingPot />, title: 'Tela de Cozinha', description: 'Sincronia perfeita entre atendimento e preparo.' },
    { icon: <FiTruck />, title: 'Delivery e Retirada', description: 'Organize suas entregas sem dor de cabeça.' },
    { icon: <FiBarChart2 />, title: 'Relatórios Inteligentes', description: 'Dados reais para tomar decisões melhores.' },
    { icon: <FiGift />, title: 'Fidelidade Digital', description: 'Faça os clientes voltarem sempre.' },
    { icon: <FiZap />, title: 'Previsão com IA', description: 'Antecipe a demanda do dia com inteligência.' }
];

export default function VendasPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": "https://colaai.com.br/#organization", "name": "Cola Aí", "url": "https://colaai.com.br", "logo": { "@type": "ImageObject", "url": "https://colaai.com.br/logo.png" } }, { "@type": "WebSite", "@id": "https://colaai.com.br/#website", "url": "https://colaai.com.br", "name": "Cola Aí", "publisher": { "@id": "https://colaai.com.br/#organization" } }, { "@type": "SoftwareApplication", "name": "Cola Aí", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": { "@type": "AggregateOffer", "priceCurrency": "BRL", "lowPrice": "49", "highPrice": "149", "offerCount": "3" }, "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "ratingCount": "3", "bestRating": "5", "worstRating": "1" } }, { "@type": "FAQPage", "mainEntity": faqs.map(faq => ({ "@type": "Question", "name": faq.question, "acceptedAnswer": { "@type": "Answer", "text": faq.answer } })) }] };

    return (
        <div className="min-h-screen bg-bg-primary overflow-x-hidden font-sans selection:bg-primary/20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Background Texture/Gradient */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-primary/5 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-accent/5 blur-[100px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
            </div>

            {/* Navbar (Simplified) */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🌭</span>
                    <span className="font-bold text-xl tracking-tight">Cola Aí</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden md:block font-medium text-text-secondary hover:text-text-primary transition-colors">
                        Entrar
                    </Link>
                    <Link href="/assinatura" className="px-5 py-2.5 bg-text-primary text-bg-primary rounded-full font-bold hover:bg-primary hover:text-white transition-all duration-300">
                        Começar Agora
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-16 pb-32 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <motion.div
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            whileHover={{
                                scale: 1.05,
                                filter: "drop-shadow(0px 0px 20px rgba(255, 107, 53, 0.4))",
                                y: -5,
                                transition: { duration: 0.2 }
                            }}
                            className="mb-8 block origin-left"
                        >
                            <Image
                                src="/logo-cola-ai.png"
                                alt="Cola Aí Logo"
                                width={300}
                                height={100}
                                className="w-auto h-24 md:h-28 object-contain"
                                priority
                            />
                        </motion.div>

                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-bg-tertiary border border-border rounded-full text-xs font-mono mb-8 text-primary">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            SISTEMA ESPECIALIZADO EM LANCHONETES
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                            Venda mais.<br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Sem chaos.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-lg leading-relaxed">
                            O sistema operacional completo para lanchonetes modernas. Pedidos, entregas e fidelidade em uma única tela.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/assinatura" className="group px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-hover transition-all shadow-[0_10px_40px_-10px_rgba(255,107,53,0.5)] hover:shadow-[0_20px_60px_-15px_rgba(255,107,53,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2">
                                Testar Grátis
                                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <button className="px-8 py-4 bg-bg-tertiary text-text-primary rounded-xl font-bold text-lg border border-border hover:border-text-secondary transition-all flex items-center justify-center gap-2">
                                <FiPlay className="fill-current" />
                                Ver Demo
                            </button>
                        </div>
                        <div className="mt-12 flex items-center gap-8 text-sm font-medium text-text-muted">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-bg-primary bg-zinc-800 flex items-center justify-center text-xs overflow-hidden">
                                        {i === 4 ? '+500' : '👤'}
                                    </div>
                                ))}
                            </div>
                            <p>Junte-se a +500 lanchonetes</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, delay: 0.2, type: "spring" }}
                        className="relative hidden lg:block"
                    >
                        <div className="absolute -inset-4 bg-linear-to-r from-primary to-accent opacity-20 blur-3xl rounded-full" />
                        <div className="relative bg-bg-card border border-border rounded-2xl p-4 shadow-2xl backdrop-blur-sm -rotate-2 hover:rotate-0 transition-transform duration-500">
                            {/* Mock UI */}
                            <div className="aspect-4/3 bg-bg-primary rounded-lg overflow-hidden relative">
                                <div className="absolute top-0 left-0 right-0 h-12 border-b border-border bg-bg-tertiary flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                </div>
                                <div className="p-8 flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">🌭</div>
                                        <div className="text-2xl font-bold text-text-primary">Dashboard Cola Aí</div>
                                        <div className="text-text-secondary">Seus dados em tempo real</div>
                                    </div>
                                </div>
                                {/* Floating Elements */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                    className="absolute top-20 right-10 bg-bg-card p-3 rounded-lg shadow-lg border border-border border-l-4 border-l-success"
                                >
                                    <div className="text-xs text-text-muted">Venda Confirmada</div>
                                    <div className="font-bold text-success">+ R$ 45,90</div>
                                </motion.div>
                                <motion.div
                                    animate={{ y: [0, 10, 0] }}
                                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                                    className="absolute bottom-20 left-10 bg-bg-card p-3 rounded-lg shadow-lg border border-border border-l-4 border-l-primary"
                                >
                                    <div className="text-xs text-text-muted">Pedido #1024</div>
                                    <div className="font-bold flex items-center gap-2">Prepare-se <GiCookingPot /></div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Highlights Grid */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Tudo o que você precisa. <br />Em um só lugar.</h2>
                        <p className="text-text-secondary text-lg">Substitua planilhas, anotações em papel e sistemas lentos por uma solução moderna.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {highlights.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-8 rounded-2xl bg-bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 rounded-xl bg-bg-tertiary flex items-center justify-center text-2xl text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-text-secondary leading-relaxed">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 px-6 bg-bg-tertiary/30 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-primary font-bold tracking-wider text-sm uppercase">Planos Flexíveis</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-6">Escolha seu poder</h2>

                        {/* Period Toggle */}
                        <div className="inline-flex bg-bg-tertiary p-1.5 rounded-xl border border-border relative">
                            <div className={cn(
                                "absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-lg shadow-sm transition-all duration-300",
                                billingPeriod === 'monthly' ? "left-1.5" : "left-[calc(50%+3px)]"
                            )} />
                            <button
                                onClick={() => setBillingPeriod('monthly')}
                                className={cn("relative z-10 px-6 py-2 rounded-lg font-bold text-sm transition-colors w-32", billingPeriod === 'monthly' ? 'text-white' : 'text-text-secondary hover:text-text-primary')}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setBillingPeriod('annual')}
                                className={cn("relative z-10 px-6 py-2 rounded-lg font-bold text-sm transition-colors w-32", billingPeriod === 'annual' ? 'text-white' : 'text-text-secondary hover:text-text-primary')}
                            >
                                Anual <span className="text-[10px] ml-1 opacity-80">-15%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                        <PricingCard
                            title="Básico"
                            description="Ideal para quem está apenas começando."
                            price="49"
                            annualPrice="490"
                            period={billingPeriod}
                            features={['Até 30 produtos', '50 vendas/mês', 'Relatórios básicos']}
                            delay={0}
                        />
                        <PricingCard
                            title="Avançado"
                            description="Para quem quer crescer de verdade."
                            price="79"
                            annualPrice="790"
                            period={billingPeriod}
                            isPopular
                            features={['Produtos ilimitados', 'Vendas ilimitadas', 'Cardápio Digital', 'Controle de Estoque', 'Fidelidade']}
                            dataSet-glow="true"
                            delay={0.1}
                        />
                        <PricingCard
                            title="Profissional"
                            description="Para operações de alto volume."
                            price="149"
                            annualPrice="1490"
                            period={billingPeriod}
                            features={['Múltiplos usuários', 'Previsão com IA', 'API de Integração', 'Suporte Prioritário']}
                            delay={0.2}
                        />
                    </div>

                    {/* Comparison Table Section */}
                    <div className="mt-32">
                        <h3 className="text-3xl font-bold text-center mb-12">Comparativo Completo</h3>
                        <ComparisonTable features={features} />
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-16">Quem usa, recomenda</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-bg-card p-8 rounded-2xl border border-border relative">
                                <span className="text-6xl absolute top-4 right-6 opacity-10 font-serif">&quot;</span>
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, j) => (
                                        <FiStar key={j} className="text-warning fill-current" />
                                    ))}
                                </div>
                                <p className="text-lg mb-8 leading-relaxed font-medium">&quot;{t.text}&quot;</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center text-2xl">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-text-primary">{t.name}</div>
                                        <div className="text-sm text-text-muted">{t.business}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-12 text-center">Perguntas Frequentes</h2>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-border rounded-xl bg-bg-card overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left font-bold hover:bg-bg-tertiary/50 transition-colors"
                            >
                                {faq.question}
                                <FiChevronDown className={cn("transition-transform duration-300", openFaq === i && "rotate-180")} />
                            </button>
                            <AnimatePresence>
                                {openFaq === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 pt-0 text-text-secondary leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-border bg-bg-tertiary/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <Link href="/" className="font-bold text-xl flex items-center justify-center md:justify-start gap-2 mb-2">
                            <span>🌭</span> Cola Aí
                        </Link>
                        <p className="text-sm text-text-muted">© 2026 Todos os direitos reservados.</p>
                    </div>
                    <div className="flex gap-8 text-sm text-text-secondary">
                        <Link href="/termos" className="hover:text-primary transition-colors">Termos</Link>
                        <Link href="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
                        <Link href="/suporte" className="hover:text-primary transition-colors">Suporte</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
