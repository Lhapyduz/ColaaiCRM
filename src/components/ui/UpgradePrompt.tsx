import React from 'react';
import Link from 'next/link';
import { FiLock, FiArrowRight, FiStar } from 'react-icons/fi';
import { PlanType, getPlanDisplayName } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
    feature: string;
    requiredPlan: PlanType;
    currentPlan: PlanType;
    fullPage?: boolean;
}

export default function UpgradePrompt({ feature, requiredPlan, currentPlan, fullPage = false }: UpgradePromptProps) {
    return (
        <div className={cn(
            'flex items-center justify-center',
            fullPage && 'min-h-[calc(100vh-200px)] p-8',
            !fullPage && 'p-8 bg-primary/5 border border-primary/20 rounded-2xl my-4'
        )}>
            <div className="text-center max-w-[500px]">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-linear-to-br from-primary/15 to-primary/5 rounded-full border-2 border-primary/30">
                    <FiLock className="text-[2.5rem] text-primary" />
                </div>

                <h2 className="text-[1.75rem] font-bold mb-4 text-text-primary">Recurso Bloqueado</h2>

                <p className="text-base text-text-secondary mb-4 leading-relaxed">
                    <strong>{feature}</strong> está disponível apenas no plano{' '}
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-linear-to-r from-primary to-[#ff8f65] text-white rounded-full text-sm font-semibold">
                        <FiStar /> {getPlanDisplayName(requiredPlan)}
                    </span>
                    {requiredPlan === 'Profissional' ? ' ou superior' : ' ou superior'}.
                </p>

                <p className="text-[0.9rem] text-text-secondary mb-6 px-3 py-3 bg-bg-secondary rounded-lg">
                    Seu plano atual: <strong>{getPlanDisplayName(currentPlan)}</strong>
                </p>

                <div className="text-left bg-bg-secondary px-5 py-5 rounded-xl mb-6">
                    <h4 className="text-[0.9rem] font-semibold mb-3 text-text-primary">
                        Com o plano {getPlanDisplayName(requiredPlan)} você tem acesso a:
                    </h4>
                    <ul className="list-none p-0 m-0">
                        {requiredPlan === 'Avançado' && (
                            <>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Até 100 produtos</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Tela de cozinha</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Gestão de entregas</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Controle de estoque</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Programa de fidelidade</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Menu digital</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Relatórios avançados</li>
                            </>
                        )}
                        {requiredPlan === 'Profissional' && (
                            <>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Produtos ilimitados</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Cupons de desconto</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Previsão de vendas com IA</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Funcionários ilimitados</li>
                                <li className="text-sm text-text-secondary py-1 flex items-center gap-2">✓ Suporte prioritário 24/7</li>
                            </>
                        )}
                    </ul>
                </div>

                <Link
                    href="/vendas#pricing"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-primary to-[#ff8f65] text-white font-semibold text-base rounded-xl no-underline transition-all duration-300 shadow-primary-glow hover:-translate-y-0.5 hover:shadow-primary-glow-lg"
                >
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
        <div className={cn(
            'flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-lg mb-4',
            isAtLimit
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-warning/10 border border-warning/30'
        )}>
            <span className="text-sm text-text-primary font-medium">
                {isAtLimit ? (
                    <>🚫 Limite atingido: {current}/{limit} {resource}</>
                ) : (
                    <>⚠️ Aviso: {current}/{limit} {resource} ({Math.round(percentage)}%)</>
                )}
            </span>
            {isAtLimit && (
                <Link
                    href="/vendas#pricing"
                    className="text-[0.8rem] text-primary no-underline font-semibold flex items-center gap-1 hover:underline"
                >
                    Fazer upgrade para {getPlanDisplayName(requiredPlan)}
                </Link>
            )}
        </div>
    );
}
