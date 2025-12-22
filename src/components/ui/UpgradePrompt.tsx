import React from 'react';
import Link from 'next/link';
import { FiLock, FiArrowRight, FiStar } from 'react-icons/fi';
import { PlanType, getPlanDisplayName } from '@/contexts/SubscriptionContext';
import styles from './UpgradePrompt.module.css';

interface UpgradePromptProps {
    feature: string;
    requiredPlan: PlanType;
    currentPlan: PlanType;
    fullPage?: boolean;
}

export default function UpgradePrompt({ feature, requiredPlan, currentPlan, fullPage = false }: UpgradePromptProps) {
    const containerClass = fullPage ? styles.fullPage : styles.inline;

    return (
        <div className={`${styles.container} ${containerClass}`}>
            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <FiLock className={styles.lockIcon} />
                </div>

                <h2 className={styles.title}>Recurso Bloqueado</h2>

                <p className={styles.description}>
                    <strong>{feature}</strong> está disponível apenas no plano{' '}
                    <span className={styles.planBadge}>
                        <FiStar /> {getPlanDisplayName(requiredPlan)}
                    </span>
                    {requiredPlan === 'Profissional' ? ' ou superior' : ' ou superior'}.
                </p>

                <p className={styles.currentPlan}>
                    Seu plano atual: <strong>{getPlanDisplayName(currentPlan)}</strong>
                </p>

                <div className={styles.benefits}>
                    <h4>Com o plano {getPlanDisplayName(requiredPlan)} você tem acesso a:</h4>
                    <ul>
                        {requiredPlan === 'Avançado' && (
                            <>
                                <li>✓ Até 100 produtos</li>
                                <li>✓ Tela de cozinha</li>
                                <li>✓ Gestão de entregas</li>
                                <li>✓ Controle de estoque</li>
                                <li>✓ Programa de fidelidade</li>
                                <li>✓ Menu digital</li>
                                <li>✓ Relatórios avançados</li>
                            </>
                        )}
                        {requiredPlan === 'Profissional' && (
                            <>
                                <li>✓ Produtos ilimitados</li>
                                <li>✓ Cupons de desconto</li>
                                <li>✓ Previsão de vendas com IA</li>
                                <li>✓ Funcionários ilimitados</li>
                                <li>✓ Suporte prioritário 24/7</li>
                            </>
                        )}
                    </ul>
                </div>

                <Link href="/vendas#pricing" className={styles.upgradeButton}>
                    Fazer Upgrade <FiArrowRight />
                </Link>
            </div>
        </div>
    );
}

// Inline version for limits
interface LimitWarningProps {
    resource: string;
    current: number;
    limit: number;
    requiredPlan: PlanType;
}

export function LimitWarning({ resource, current, limit, requiredPlan }: LimitWarningProps) {
    const percentage = (current / limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = current >= limit;

    if (!isNearLimit) return null;

    return (
        <div className={`${styles.limitWarning} ${isAtLimit ? styles.atLimit : ''}`}>
            <span className={styles.limitText}>
                {isAtLimit ? (
                    <>🚫 Limite atingido: {current}/{limit} {resource}</>
                ) : (
                    <>⚠️ Aviso: {current}/{limit} {resource} ({Math.round(percentage)}%)</>
                )}
            </span>
            {isAtLimit && (
                <Link href="/vendas#pricing" className={styles.upgradeLink}>
                    Fazer upgrade para {getPlanDisplayName(requiredPlan)}
                </Link>
            )}
        </div>
    );
}
