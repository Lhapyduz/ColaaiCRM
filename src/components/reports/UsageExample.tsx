'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RelatorioPDFCompleto, { ReportData } from '@/components/reports/RelatorioPDFCompleto';

// PDFDownloadLink needs to be client-side only to avoid server-side rendering mismatch
// or just ensure this component is rendered on client.

export default function DashboardPage() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Exemplo de dados gerados dinamicamente do seu dashboard
    const reportData: ReportData = {
        periodoSelecionado: 'Este Mês (Janeiro 2026)',
        secoes: [
            {
                titulo: 'Resumo Financeiro',
                tipo: 'kpi',
                dados: [
                    { label: 'Receita Total', value: 'R$ 12.500,00' },
                    { label: 'Pedidos', value: '342' },
                    { label: 'Ticket Médio', value: 'R$ 36,50' },
                    { label: 'Lucro Líquido', value: 'R$ 4.200,00' },
                ],
            },
            {
                titulo: 'Top Produtos Vendidos',
                tipo: 'tabela',
                dados: [ // Dados genéricos
                    { produto: 'Hotdog Completo', qtd: 120, total: 'R$ 1.200,00' },
                    { produto: 'Refrigerante Lata', qtd: 85, total: 'R$ 425,00' },
                    { produto: 'Batata Frita', qtd: 60, total: 'R$ 600,00' },
                ],
                // Colunas opcionais, se não passar, ele tenta inferir das chaves
                colunas: [
                    { header: 'Produto', key: 'produto', width: '50%' },
                    { header: 'Qtd.', key: 'qtd', width: '20%' },
                    { header: 'Total', key: 'total', width: '30%' },
                ]
            },
            {
                titulo: 'Feedback Recente',
                tipo: 'lista',
                dados: [
                    'Ótimo atendimento e comida quentinha!',
                    'Demorou um pouco a entrega mas estava bom.',
                    'Adorei o novo molho especial.',
                ],
            },
        ],
        comparacao: {
            periodo: 'Mês Passado',
            dados: {
                'Crescimento': '+12%',
                'Novos Clientes': '45',
            }
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

            {/* Outros componentes do Dashboard... */}

            <div className="mt-8 p-4 border rounded bg-gray-50">
                <h2 className="text-lg font-semibold mb-2">Exportar Relatórios</h2>
                <p className="mb-4 text-sm text-gray-600">Baixe o relatório completo em PDF.</p>

                {isClient && (
                    <PDFDownloadLink
                        document={<RelatorioPDFCompleto reportData={reportData} />}
                        fileName="relatorio_gerencial.pdf"
                        className="inline-flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                    >
                        {({ blob, url, loading, error }) =>
                            loading ? 'Gerando PDF...' : 'Baixar Relatório Completo (PDF)'
                        }
                    </PDFDownloadLink>
                )}
            </div>
        </div>
    );
}
