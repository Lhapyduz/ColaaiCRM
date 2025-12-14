'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';

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
        <div className={styles.container}>
            <div className={styles.backgroundEffects}>
                <div className={styles.blob1} />
                <div className={styles.blob2} />
                <div className={styles.grid} />
            </div>

            <div className={styles.content}>
                <div className={styles.brandSection}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🌭</span>
                        <h1 className={styles.brandName}>Cola Aí</h1>
                    </div>
                    <p className={styles.tagline}>
                        Gerencie seu negócio de lanches de forma simples e eficiente
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>📋</span>
                            <span>Controle de Pedidos</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>👨‍🍳</span>
                            <span>Fila de Preparo</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>🚚</span>
                            <span>Gestão de Entregas</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>💰</span>
                            <span>Controle Financeiro</span>
                        </div>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <h2>Bem-vindo de volta!</h2>
                            <p>Entre na sua conta para continuar</p>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}

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

                            <div className={styles.forgotPassword}>
                                <Link href="/recuperar-senha">Esqueceu a senha?</Link>
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

                        <div className={styles.divider}>
                            <span>ou</span>
                        </div>

                        <p className={styles.signupLink}>
                            Não tem uma conta?{' '}
                            <Link href="/registro">Crie gratuitamente</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
