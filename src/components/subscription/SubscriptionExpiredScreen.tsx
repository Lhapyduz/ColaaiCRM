'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiCreditCard } from 'react-icons/fi';

interface SubscriptionExpiredScreenProps {
    message?: string;
}

export default function SubscriptionExpiredScreen({ message }: SubscriptionExpiredScreenProps) {
    const router = useRouter();

    const handleRenew = () => {
        router.push('/assinatura');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 max-w-[480px] w-full text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] max-[480px]:p-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-[#ff6b6b] to-[#ee5253] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(238,82,83,0.4)] max-[480px]:w-16 max-[480px]:h-16">
                    <FiAlertTriangle className="text-[2.5rem] text-white max-[480px]:text-[2rem]" />
                </div>

                <h1 className="text-[1.75rem] font-bold text-white mb-4 tracking-tight max-[480px]:text-2xl">Plano Expirado</h1>

                <p className="text-white/70 text-base leading-relaxed mb-8">
                    {message || 'Seu plano de assinatura expirou. Para continuar usando o Cola Aí, por favor renove sua assinatura.'}
                </p>

                <div className="bg-white/5 rounded-xl p-5 mb-8 text-left">
                    <p className="text-white/80 text-sm font-semibold mb-3">Com sua assinatura ativa, você tem acesso a:</p>
                    <ul className="list-none p-0 m-0">
                        <li className="text-white/60 text-sm py-1.5">✓ Gestão completa de pedidos</li>
                        <li className="text-white/60 text-sm py-1.5">✓ Controle de estoque</li>
                        <li className="text-white/60 text-sm py-1.5">✓ Relatórios detalhados</li>
                        <li className="text-white/60 text-sm py-1.5">✓ Programa de fidelidade</li>
                        <li className="text-white/60 text-sm py-1.5">✓ E muito mais!</li>
                    </ul>
                </div>

                <button
                    className="inline-flex items-center justify-center gap-2 w-full py-4 px-8 bg-linear-to-r from-[#00d9ff] to-[#00b4d8] text-white text-lg font-semibold border-none rounded-xl cursor-pointer transition-all duration-300 shadow-[0_10px_30px_rgba(0,180,216,0.3)] hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(0,180,216,0.4)] active:translate-y-0"
                    onClick={handleRenew}
                >
                    <FiCreditCard className="text-xl" />
                    <span>Renovar Assinatura</span>
                </button>

                <p className="mt-6 text-white/40 text-[0.8rem]">
                    Precisa de ajuda? Entre em contato com nosso suporte.
                </p>
            </div>
        </div>
    );
}
