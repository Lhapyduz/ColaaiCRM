'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await signIn(email, password);
            if (error) {
                setError('Email ou senha incorretos');
            } else {
                router.push('/dashboard');
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
                <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_70%)] rounded-full blur-[60px] animate-[float_8s_ease-in-out_infinite]" />
                <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,184,148,0.1)_0%,transparent_70%)] rounded-full blur-[60px] animate-[float_10s_ease-in-out_infinite_reverse]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[50px_50px]" />
            </div>

            <div className="flex flex-1 z-1">
                {/* Brand Section */}
                <div className="flex-1 flex flex-col justify-center p-15 bg-linear-to-br from-primary/10 to-transparent max-lg:hidden">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-[3.5rem] animate-bounce">🌭</span>
                        <h1 className="text-5xl font-extrabold bg-linear-to-br from-primary to-accent bg-clip-text text-transparent">
                            Cola Aí
                        </h1>
                    </div>
                    <p className="text-xl text-text-secondary max-w-[400px] leading-relaxed mb-12">
                        Gerencie seu negócio de lanches de forma simples e eficiente
                    </p>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">📋</span>
                            <span>Controle de Pedidos</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">👨‍🍳</span>
                            <span>Fila de Preparo</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">🚚</span>
                            <span>Gestão de Entregas</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 rounded-md border border-white/5 transition-all duration-normal hover:bg-white/6 hover:border-white/10 hover:translate-x-1">
                            <span className="text-2xl">💰</span>
                            <span>Controle Financeiro</span>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="flex-1 flex items-center justify-center p-15 max-lg:p-6">
                    <div className="w-full max-w-[420px] p-10 bg-bg-card rounded-xl border border-border shadow-xl max-[480px]:p-6">
                        <div className="text-center mb-8">
                            <h2 className="text-[1.75rem] font-bold mb-2">Bem-vindo de volta!</h2>
                            <p className="text-text-secondary">Entre na sua conta para continuar</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {error && (
                                <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-md text-error text-sm text-center">
                                    {error}
                                </div>
                            )}

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
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<FiLock />}
                                required
                            />

                            <div className="text-right -mt-2">
                                <Link href="/recuperar-senha" className="text-sm text-text-secondary transition-colors duration-fast hover:text-primary">
                                    Esqueceu a senha?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                isLoading={loading}
                                rightIcon={<FiArrowRight />}
                            >
                                Entrar
                            </Button>
                        </form>

                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-sm text-text-muted">ou</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <p className="text-center text-text-secondary">
                            Não tem uma conta?{' '}
                            <Link href="/registro" className="text-primary font-medium transition-opacity duration-fast hover:opacity-80">
                                Crie gratuitamente
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
