'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    FiCheck,
    FiX,
    FiChevronDown,
    FiChevronUp,
    FiShoppingBag,
    FiTruck,
    FiBarChart2,
    FiUsers,
    FiGift,
    FiTag,
    FiPackage,
    FiCreditCard,
    FiSmartphone,
    FiSettings,
    FiStar,
    FiZap,
    FiShield,
    FiHeadphones
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import styles from './page.module.css';

type BillingPeriod = 'monthly' | 'annual';

interface PlanFeature {
    name: string;
    basic: boolean | string;
    professional: boolean | string;
    enterprise: boolean | string;
}

interface FAQ {
    question: string;
    answer: string;
}

const features: PlanFeature[] = [
    { name: 'Dashboard em Tempo Real', basic: true, professional: true, enterprise: true },
    { name: 'Gestão de Pedidos', basic: true, professional: true, enterprise: true },
    { name: 'Produtos', basic: 'Até 30', professional: 'Até 100', enterprise: 'Ilimitado' },
    { name: 'Categorias', basic: 'Até 5', professional: 'Até 15', enterprise: 'Ilimitado' },
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
    {
        question: 'Posso testar antes de assinar?',
        answer: 'Sim! Oferecemos 7 dias de teste grátis em todos os planos, sem necessidade de cartão de crédito. Você terá acesso a todas as funcionalidades do plano escolhido.'
    },
    {
        question: 'Como funciona a cobrança?',
        answer: 'A cobrança é feita de forma recorrente via cartão de crédito, boleto ou PIX. Você pode cancelar a qualquer momento, sem multas ou taxas adicionais.'
    },
    {
        question: 'Posso mudar de plano depois?',
        answer: 'Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. A diferença será calculada proporcionalmente ao tempo restante da assinatura.'
    },
    {
        question: 'Meus dados estão seguros?',
        answer: 'Utilizamos criptografia de ponta a ponta e armazenamos seus dados em servidores seguros da Supabase. Fazemos backups automáticos diários e seguimos as melhores práticas de segurança.'
    },
    {
        question: 'Preciso instalar algum programa?',
        answer: 'Não! O Cola Aí é 100% baseado na nuvem. Você acessa pelo navegador de qualquer dispositivo - computador, tablet ou celular.'
    },
    {
        question: 'Vocês oferecem treinamento?',
        answer: 'Sim! Todos os planos incluem acesso à nossa central de ajuda com tutoriais em vídeo. Nos planos Profissional e Enterprise, oferecemos sessões de treinamento ao vivo.'
    }
];

const testimonials = [
    {
        name: 'Carlos Silva',
        business: 'Hot Dog do Carlão',
        avatar: '👨‍🍳',
        text: 'Desde que comecei a usar o Cola Aí, meu faturamento aumentou 40%. A organização dos pedidos é impecável!',
        rating: 5
    },
    {
        name: 'Maria Santos',
        business: 'Lanchonete da Maria',
        avatar: '👩‍💼',
        text: 'O programa de fidelidade fez meus clientes voltarem muito mais. Já tenho mais de 200 clientes cadastrados!',
        rating: 5
    },
    {
        name: 'João Pereira',
        business: 'Burger House',
        avatar: '👨‍💻',
        text: 'Os relatórios me ajudam a entender melhor meu negócio. Sei exatamente quais produtos vendem mais.',
        rating: 5
    }
];

const highlights = [
    {
        icon: <FiShoppingBag />,
        title: 'Gestão de Pedidos',
        description: 'Controle completo do fluxo de pedidos, do recebimento à entrega.'
    },
    {
        icon: <GiCookingPot />,
        title: 'Tela de Cozinha',
        description: 'Visualização em tempo real para sua equipe de preparo.'
    },
    {
        icon: <FiTruck />,
        title: 'Gestão de Entregas',
        description: 'Acompanhe suas entregas e otimize rotas.'
    },
    {
        icon: <FiBarChart2 />,
        title: 'Relatórios Avançados',
        description: 'Gráficos e métricas para decisões inteligentes.'
    },
    {
        icon: <FiGift />,
        title: 'Programa de Fidelidade',
        description: '4 níveis de recompensas para fidelizar clientes.'
    },
    {
        icon: <FiTag />,
        title: 'Cupons de Desconto',
        description: 'Crie promoções e atraia mais clientes.'
    },
    {
        icon: <FiPackage />,
        title: 'Controle de Estoque',
        description: 'Alertas de estoque baixo e controle de ingredientes.'
    },
    {
        icon: <FiSmartphone />,
        title: 'Cardápio Online',
        description: 'Seus clientes fazem pedidos pelo celular.'
    },
    {
        icon: <FiCreditCard />,
        title: 'Múltiplos Pagamentos',
        description: 'Aceite PIX, cartão, dinheiro e muito mais.'
    },
    {
        icon: <FiUsers />,
        title: 'Multi-funcionários',
        description: 'Gerencie sua equipe com diferentes acessos.'
    },
    {
        icon: <FiSettings />,
        title: 'Personalização Total',
        description: 'Sua marca, suas cores, seu logo.'
    },
    {
        icon: <FiZap />,
        title: 'Previsão de Vendas',
        description: 'IA que prevê suas vendas do dia.'
    }
];

export default function VendasPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const prices = {
        basic: {
            monthly: 49,
            annual: 490
        },
        professional: {
            monthly: 79,
            annual: 790
        },
        enterprise: {
            monthly: 149,
            annual: 1490
        }
    };

    const getMonthlyPrice = (plan: 'basic' | 'professional' | 'enterprise') => {
        const total = prices[plan][billingPeriod];
        if (billingPeriod === 'annual') {
            return (total / 12).toFixed(2).replace('.', ',');
        }
        return total.toString();
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getDiscount = () => {
        if (billingPeriod === 'annual') {
            return '2 Meses Grátis';
        }
        return null;
    };

    const renderFeatureValue = (value: boolean | string) => {
        if (typeof value === 'boolean') {
            return value ? (
                <FiCheck className={styles.checkIcon} />
            ) : (
                <FiX className={styles.xIcon} />
            );
        }
        return <span className={styles.featureText}>{value}</span>;
    };

    return (
        <div className={styles.page}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroBackground}>
                    <div className={styles.heroGlow1}></div>
                    <div className={styles.heroGlow2}></div>
                </div>
                <div className={styles.heroContent}>
                    <span className={styles.heroBadge}>
                        <FiZap /> Sistema #1 para Lanchonetes
                    </span>
                    <h1 className={styles.heroTitle}>
                        Transforme sua <span className={styles.highlight}>Lanchonete</span> em uma Máquina de Vendas
                    </h1>
                    <p className={styles.heroSubtitle}>
                        O sistema completo para gerenciar pedidos, fidelizar clientes e aumentar seu faturamento. Tudo em um só lugar, sem complicação.
                    </p>
                    <div className={styles.heroCtas}>
                        <Link href="/assinatura" className={styles.primaryCta}>
                            Começar Agora - 7 Dias Grátis
                        </Link>
                        <Link href="/menu" className={styles.secondaryCta}>
                            Ver Demo <FiChevronDown />
                        </Link>
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.heroStat}>
                            <span className={styles.statNumber}>500+</span>
                            <span className={styles.statLabel}>Negócios Ativos</span>
                        </div>
                        <div className={styles.heroStat}>
                            <span className={styles.statNumber}>50k+</span>
                            <span className={styles.statLabel}>Pedidos/Mês</span>
                        </div>
                        <div className={styles.heroStat}>
                            <span className={styles.statNumber}>98%</span>
                            <span className={styles.statLabel}>Satisfação</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className={styles.featuresSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Tudo que você precisa para crescer</h2>
                    <p className={styles.sectionSubtitle}>
                        Mais de 20 funcionalidades pensadas para o dia a dia do seu negócio
                    </p>
                </div>
                <div className={styles.featuresGrid}>
                    {highlights.map((feature, index) => (
                        <div key={index} className={styles.featureCard}>
                            <div className={styles.featureIcon}>{feature.icon}</div>
                            <h3 className={styles.featureTitle}>{feature.title}</h3>
                            <p className={styles.featureDescription}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={styles.pricingSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Escolha o plano ideal para você</h2>
                    <p className={styles.sectionSubtitle}>
                        Comece grátis por 7 dias. Cancele quando quiser.
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className={styles.billingToggle}>
                    <button
                        className={`${styles.toggleBtn} ${billingPeriod === 'monthly' ? styles.active : ''}`}
                        onClick={() => setBillingPeriod('monthly')}
                    >
                        Mensal
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${billingPeriod === 'annual' ? styles.active : ''}`}
                        onClick={() => setBillingPeriod('annual')}
                    >
                        Anual
                        <span className={styles.discountBadge}>2 Meses Grátis</span>
                    </button>
                </div>

                {/* Pricing Cards */}
                <div className={styles.pricingGrid}>
                    {/* Basic Plan */}
                    <div className={styles.pricingCard}>
                        <div className={styles.planHeader}>
                            <h3 className={styles.planName}>Básico</h3>
                            <p className={styles.planDescription}>Para quem está começando</p>
                        </div>
                        <div className={styles.planPrice}>
                            <span className={styles.currency}>R$</span>
                            <span className={styles.amount}>{getMonthlyPrice('basic')}</span>
                            <span className={styles.period}>/mês</span>
                        </div>
                        {billingPeriod !== 'monthly' && (
                            <p className={styles.billingNote}>
                                Cobrado {formatCurrency(prices.basic[billingPeriod])} anualmente
                            </p>
                        )}
                        <ul className={styles.planFeatures}>
                            <li><FiCheck /> Dashboard em tempo real</li>
                            <li><FiCheck /> Gestão de pedidos</li>
                            <li><FiCheck /> Até 30 produtos</li>
                            <li><FiCheck /> Até 5 categorias</li>
                            <li><FiCheck /> Relatórios básicos</li>
                            <li><FiCheck /> Suporte por email</li>
                        </ul>
                        <Link href="/assinatura" className={styles.planCta}>Começar Grátis</Link>
                    </div>

                    {/* Professional Plan */}
                    <div className={`${styles.pricingCard} ${styles.featured}`}>
                        <div className={styles.popularBadge}>Mais Popular</div>
                        <div className={styles.planHeader}>
                            <h3 className={styles.planName}>Avançado</h3>
                            <p className={styles.planDescription}>Para negócios em crescimento</p>
                        </div>
                        <div className={styles.planPrice}>
                            <span className={styles.currency}>R$</span>
                            <span className={styles.amount}>{getMonthlyPrice('professional')}</span>
                            <span className={styles.period}>/mês</span>
                        </div>
                        {billingPeriod !== 'monthly' && (
                            <p className={styles.billingNote}>
                                Cobrado {formatCurrency(prices.professional[billingPeriod])} anualmente
                            </p>
                        )}
                        <ul className={styles.planFeatures}>
                            <li><FiCheck /> Tudo do Básico +</li>
                            <li><FiCheck /> Até 100 produtos</li>
                            <li><FiCheck /> Tela de cozinha</li>
                            <li><FiCheck /> Gestão de entregas</li>
                            <li><FiCheck /> Controle de estoque</li>
                            <li><FiCheck /> Programa de fidelidade</li>
                            <li><FiCheck /> Cardápio Online</li>
                            <li><FiCheck /> Relatórios avançados</li>
                            <li><FiCheck /> Até 5 funcionários</li>
                            <li><FiCheck /> Suporte via chat</li>
                        </ul>
                        <Link href="/assinatura" className={`${styles.planCta} ${styles.primaryPlanCta}`}>Começar Grátis</Link>
                    </div>

                    {/* Enterprise Plan */}
                    <div className={styles.pricingCard}>
                        <div className={styles.planHeader}>
                            <h3 className={styles.planName}>Profissional</h3>
                            <p className={styles.planDescription}>Para operações maiores</p>
                        </div>
                        <div className={styles.planPrice}>
                            <span className={styles.currency}>R$</span>
                            <span className={styles.amount}>{getMonthlyPrice('enterprise')}</span>
                            <span className={styles.period}>/mês</span>
                        </div>
                        {billingPeriod !== 'monthly' && (
                            <p className={styles.billingNote}>
                                Cobrado {formatCurrency(prices.enterprise[billingPeriod])} anualmente
                            </p>
                        )}
                        <ul className={styles.planFeatures}>
                            <li><FiCheck /> Tudo do Avançado +</li>
                            <li><FiCheck /> Produtos ilimitados</li>
                            <li><FiCheck /> Cupons de desconto</li>
                            <li><FiCheck /> Previsão de vendas (IA)</li>
                            <li><FiCheck /> Funcionários ilimitados</li>
                            <li><FiCheck /> Relatórios completos</li>
                            <li><FiCheck /> Suporte prioritário 24/7</li>
                        </ul>
                        <Link href="/assinatura" className={styles.planCta}>Começar Grátis</Link>
                    </div>
                </div>

                {/* Feature Comparison Table */}
                <div className={styles.comparisonSection}>
                    <h3 className={styles.comparisonTitle}>Comparativo Completo</h3>
                    <div className={styles.comparisonTable}>
                        <div className={styles.tableHeader}>
                            <div className={styles.tableHeaderCell}>Recurso</div>
                            <div className={styles.tableHeaderCell}>Básico</div>
                            <div className={styles.tableHeaderCell}>Avançado</div>
                            <div className={styles.tableHeaderCell}>Profissional</div>
                        </div>
                        {features.map((feature, index) => (
                            <div key={index} className={styles.tableRow}>
                                <div className={styles.tableCell}>{feature.name}</div>
                                <div className={styles.tableCell}>{renderFeatureValue(feature.basic)}</div>
                                <div className={styles.tableCell}>{renderFeatureValue(feature.professional)}</div>
                                <div className={styles.tableCell}>{renderFeatureValue(feature.enterprise)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className={styles.testimonialsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>O que nossos clientes dizem</h2>
                    <p className={styles.sectionSubtitle}>
                        Mais de 500 negócios já transformaram suas operações
                    </p>
                </div>
                <div className={styles.testimonialsGrid}>
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className={styles.testimonialCard}>
                            <div className={styles.testimonialStars}>
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <FiStar key={i} className={styles.starIcon} />
                                ))}
                            </div>
                            <p className={styles.testimonialText}>"{testimonial.text}"</p>
                            <div className={styles.testimonialAuthor}>
                                <span className={styles.testimonialAvatar}>{testimonial.avatar}</span>
                                <div>
                                    <span className={styles.testimonialName}>{testimonial.name}</span>
                                    <span className={styles.testimonialBusiness}>{testimonial.business}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust Badges */}
            <section className={styles.trustSection}>
                <div className={styles.trustGrid}>
                    <div className={styles.trustItem}>
                        <FiShield className={styles.trustIcon} />
                        <h4>Dados Seguros</h4>
                        <p>Criptografia de ponta a ponta</p>
                    </div>
                    <div className={styles.trustItem}>
                        <FiZap className={styles.trustIcon} />
                        <h4>99.9% Uptime</h4>
                        <p>Sistema sempre disponível</p>
                    </div>
                    <div className={styles.trustItem}>
                        <FiHeadphones className={styles.trustIcon} />
                        <h4>Suporte Humano</h4>
                        <p>Atendimento real, sem robôs</p>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className={styles.faqSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
                    <p className={styles.sectionSubtitle}>
                        Tire suas dúvidas sobre o Cola Aí
                    </p>
                </div>
                <div className={styles.faqList}>
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`${styles.faqItem} ${openFaq === index ? styles.open : ''}`}
                        >
                            <button
                                className={styles.faqQuestion}
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            >
                                <span>{faq.question}</span>
                                {openFaq === index ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            <div className={styles.faqAnswer}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className={styles.finalCta}>
                <div className={styles.ctaContent}>
                    <h2>Pronto para turbinar seu negócio?</h2>
                    <p>Comece seus 7 dias grátis agora. Sem cartão de crédito.</p>
                    <Link href="/assinatura" className={styles.ctaButton}>
                        Começar Agora - É Grátis!
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>© 2024 Cola Aí. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
