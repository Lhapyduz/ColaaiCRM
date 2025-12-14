'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import styles from './page.module.css';

export default function RelatoriosPage() {
    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Relatórios</h1>
                    <p className={styles.subtitle}>Análise de desempenho do seu negócio</p>
                </div>

                <div className={styles.comingSoon}>
                    <span className={styles.icon}>📊</span>
                    <h2>Em Breve!</h2>
                    <p>
                        Estamos trabalhando em relatórios detalhados para você acompanhar
                        o desempenho do seu negócio.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <span>📈</span>
                            <span>Gráficos de vendas</span>
                        </div>
                        <div className={styles.feature}>
                            <span>🏆</span>
                            <span>Produtos mais vendidos</span>
                        </div>
                        <div className={styles.feature}>
                            <span>📅</span>
                            <span>Comparativo por período</span>
                        </div>
                        <div className={styles.feature}>
                            <span>💰</span>
                            <span>Análise de receita</span>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
