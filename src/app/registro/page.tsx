'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiUser, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';

export default function RegistroPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

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
            const { error } = await signUp(email, password, name);
            if (error) {
                setError('Erro ao criar conta. Tente outro email.');
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
                <div className={styles.formSection}>
                    <div className={styles.formCard}>
                        <div className={styles.logo}>
                            <span className={styles.logoIcon}>🌭</span>
                            <h1 className={styles.brandName}>Cola Aí</h1>
                        </div>

                        <div className={styles.formHeader}>
                            <h2>Criar sua conta</h2>
                            <p>Comece a gerenciar seu negócio hoje</p>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}

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

                        <div className={styles.divider}>
                            <span>ou</span>
                        </div>

                        <p className={styles.loginLink}>
                            Já tem uma conta?{' '}
                            <Link href="/login">Faça login</Link>
                        </p>
                    </div>
                </div>

                <div className={styles.infoSection}>
                    <h2>Tudo o que você precisa para gerenciar seu negócio</h2>
                    <div className={styles.infoList}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>✅</span>
                            <div>
                                <h3>Gestão Completa de Pedidos</h3>
                                <p>Crie, acompanhe e gerencie todos os seus pedidos em um só lugar</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>✅</span>
                            <div>
                                <h3>Fila de Preparo Inteligente</h3>
                                <p>Organize a produção da cozinha com ordem de prioridade</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>✅</span>
                            <div>
                                <h3>Controle de Entregas</h3>
                                <p>Acompanhe suas entregas em tempo real</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>✅</span>
                            <div>
                                <h3>Personalização Total</h3>
                                <p>Altere nome, logo e cores do seu app</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
