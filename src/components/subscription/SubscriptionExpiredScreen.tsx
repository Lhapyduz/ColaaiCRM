'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiCreditCard } from 'react-icons/fi';
import styles from './SubscriptionExpiredScreen.module.css';

interface SubscriptionExpiredScreenProps {
    message?: string;
}

export default function SubscriptionExpiredScreen({ message }: SubscriptionExpiredScreenProps) {
    const router = useRouter();

    const handleRenew = () => {
        router.push('/assinatura');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <FiAlertTriangle className={styles.icon} />
                </div>

                <h1 className={styles.title}>Plano Expirado</h1>

                <p className={styles.message}>
                    {message || 'Seu plano de assinatura expirou. Para continuar usando o Cola Aí, por favor renove sua assinatura.'}
                </p>

                <div className={styles.features}>
                    <p className={styles.featuresTitle}>Com sua assinatura ativa, você tem acesso a:</p>
                    <ul className={styles.featuresList}>
                        <li>✓ Gestão completa de pedidos</li>
                        <li>✓ Controle de estoque</li>
                        <li>✓ Relatórios detalhados</li>
                        <li>✓ Programa de fidelidade</li>
                        <li>✓ E muito mais!</li>
                    </ul>
                </div>

                <button
                    className={styles.renewButton}
                    onClick={handleRenew}
                >
                    <FiCreditCard />
                    <span>Renovar Assinatura</span>
                </button>

                <p className={styles.helpText}>
                    Precisa de ajuda? Entre em contato com nosso suporte.
                </p>
            </div>
        </div>
    );
}
