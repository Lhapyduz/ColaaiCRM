'use client';

import React from 'react';
import { FiClock, FiZap } from 'react-icons/fi';
import Link from 'next/link';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface TrialBannerProps {
    className?: string;
}

/**
 * Banner que mostra informações do período de trial
 * Exibe contagem regressiva e botão para assinar
 */
export function TrialBanner({ className = '' }: TrialBannerProps) {
    const { subscription, daysLeftInTrial, loading } = useSubscription();

    // Não exibe se não estiver em trial ou estiver carregando
    if (loading || !subscription || subscription.status !== 'trial') {
        return null;
    }

    // Calcula cor baseado nos dias restantes
    const isUrgent = daysLeftInTrial <= 1;
    const isWarning = daysLeftInTrial === 2;

    const bgColor = isUrgent
        ? 'bg-gradient-to-r from-error/20 to-error/10 border-error/30'
        : isWarning
            ? 'bg-gradient-to-r from-warning/20 to-warning/10 border-warning/30'
            : 'bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30';

    const textColor = isUrgent
        ? 'text-error'
        : isWarning
            ? 'text-warning'
            : 'text-accent';

    const daysText = daysLeftInTrial === 1
        ? '1 dia restante'
        : daysLeftInTrial === 0
            ? 'Último dia!'
            : `${daysLeftInTrial} dias restantes`;

    return (
        <div className={`${bgColor} border rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUrgent ? 'bg-error/20' : isWarning ? 'bg-warning/20' : 'bg-accent/20'}`}>
                        <FiClock className={`text-xl ${textColor}`} />
                    </div>
                    <div>
                        <p className={`font-semibold ${textColor}`}>
                            Período de Teste Gratuito
                        </p>
                        <p className="text-sm text-text-secondary">
                            {daysText} para explorar todos os recursos
                        </p>
                    </div>
                </div>

                <Link
                    href="/assinatura"
                    className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                        transition-all duration-200 
                        ${isUrgent
                            ? 'bg-error text-white hover:bg-error/90 shadow-lg shadow-error/25'
                            : isWarning
                                ? 'bg-warning text-black hover:bg-warning/90 shadow-lg shadow-warning/25'
                                : 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25'
                        }
                    `}
                >
                    <FiZap className="text-lg" />
                    <span>Assinar Agora</span>
                </Link>
            </div>
        </div>
    );
}

export default TrialBanner;
