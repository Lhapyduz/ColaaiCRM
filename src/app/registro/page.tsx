'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiUser, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useFingerprint } from '@/hooks/useFingerprint';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegistroPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [trialBlocked, setTrialBlocked] = useState(false);
    const [trialBlockReason, setTrialBlockReason] = useState('');

    const { signUp } = useAuth();
    const { fingerprint, loading: fingerprintLoading } = useFingerprint();
    const router = useRouter();

    // Verificar elegibilidade para trial quando fingerprint estiver pronto
    useEffect(() => {
        async function checkTrialEligibility() {
            if (!fingerprint || fingerprintLoading) return;

            try {
                const response = await fetch('/api/fingerprint/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fingerprintHash: fingerprint }),
                });

                const data = await response.json();

                if (!data.canTrial) {
                    setTrialBlocked(true);
                    setTrialBlockReason(data.reason || 'Este dispositivo não é elegível para trial.');
                }
            } catch (err) {
                console.warn('[Registro] Failed to verify trial eligibility:', err);
                // Fail-open: permite cadastro em caso de erro
            }
        }

        checkTrialEligibility();
    }, [fingerprint, fingerprintLoading]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const { error } = await signUp(email, password, name, fingerprint || undefined);
            if (error) {
                setError('Erro ao criar conta. Tente outro email.');
            } else {
                // Redireciona para assinatura (trial já foi criado)
                router.push('/assinatura?trial=new');
            }
        } catch {
            setError('Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-[200px] -left-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,184,148,0.15)_0%,transparent_70%)] rounded-full blur-[60px] animate-[float_8s_ease-in-out_infinite]" />
                <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.1)_0%,transparent_70%)] rounded-full blur-[60px] animate-[float_10s_ease-in-out_infinite_reverse]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[50px_50px]" />
            </div>

            <div className="flex flex-1 z-1">
                {/* Form Section */}
                <div className="flex-1 flex items-center justify-center p-10 max-lg:p-6">
                    <div className="w-full max-w-[440px] p-9 bg-bg-card rounded-xl border border-border shadow-xl max-[480px]:p-6">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <span className="text-[2.5rem] animate-bounce">🌭</span>
                            <h1 className="text-[2rem] font-extrabold bg-linear-to-br from-primary to-accent bg-clip-text text-transparent">
                                Cola Aí
                            </h1>
                        </div>

                        <div className="text-center mb-7">
                            <h2 className="text-2xl font-bold mb-2">Criar sua conta</h2>
                            <p className="text-text-secondary">Comece a gerenciar seu negócio hoje</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {trialBlocked && (
                                <div className="px-4 py-3 bg-warning/10 border border-warning/30 rounded-md text-warning text-sm flex items-start gap-2">
                                    <FiAlertCircle className="text-lg shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Trial não disponível</p>
                                        <p className="opacity-80">{trialBlockReason}</p>
                                        <p className="mt-1">Você pode criar uma conta, mas precisará escolher um plano pago.</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-md text-error text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Nome do Negócio"
                                type="text"
                                placeholder="Ex: Hot Dog do João"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                leftIcon={<FiUser />}
                                required
                            />

                            <Input
                                label="E-mail"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<FiMail />}
                                required
                            />

                            <Input
                                label="Senha"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<FiLock />}
                                required
                            />

                            <Input
                                label="Confirmar Senha"
                                type="password"
                                placeholder="Digite a senha novamente"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                leftIcon={<FiLock />}
                                required
                            />

                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                isLoading={loading}
                                rightIcon={<FiArrowRight />}
                            >
                                Criar Conta
                            </Button>
                        </form>

                        <div className="flex items-center gap-4 my-5">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-sm text-text-muted">ou</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <p className="text-center text-text-secondary">
                            Já tem uma conta?{' '}
                            <Link href="/login" className="text-primary font-medium transition-opacity duration-fast hover:opacity-80">
                                Faça login
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 flex flex-col justify-center p-15 bg-linear-to-br from-accent/5 to-transparent max-lg:hidden">
                    <h2 className="text-[2rem] font-bold mb-10 max-w-[400px]">
                        Tudo o que você precisa para gerenciar seu negócio
                    </h2>
                    <div className="flex flex-col gap-6">
                        <div className="flex gap-4 p-5 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">✅</span>
                            <div>
                                <h3 className="text-base font-semibold mb-1">Gestão Completa de Pedidos</h3>
                                <p className="text-sm text-text-secondary">Crie, acompanhe e gerencie todos os seus pedidos em um só lugar</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-5 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">✅</span>
                            <div>
                                <h3 className="text-base font-semibold mb-1">Fila de Preparo Inteligente</h3>
                                <p className="text-sm text-text-secondary">Organize a produção da cozinha com ordem de prioridade</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-5 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">✅</span>
                            <div>
                                <h3 className="text-base font-semibold mb-1">Controle de Entregas</h3>
                                <p className="text-sm text-text-secondary">Acompanhe suas entregas em tempo real</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-5 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">✅</span>
                            <div>
                                <h3 className="text-base font-semibold mb-1">Personalização Total</h3>
                                <p className="text-sm text-text-secondary">Altere nome, logo e cores do seu app</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
