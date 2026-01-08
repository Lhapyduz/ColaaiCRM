'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FiMail, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';

export default function RecuperarSenhaPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/redefinir-senha`,
            });

            if (error) {
                setError('Erro ao enviar email. Verifique se o email está correto.');
            } else {
                setSuccess(true);
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

                        {success ? (
                            <div className={styles.successState}>
                                <div className={styles.successIcon}>
                                    <FiCheck size={48} />
                                </div>
                                <h2>Email Enviado!</h2>
                                <p>
                                    Enviamos um link de recuperação para <strong>{email}</strong>.
                                    Verifique sua caixa de entrada e spam.
                                </p>
                                <Link href="/login" className={styles.backToLogin}>
                                    <FiArrowLeft /> Voltar para o Login
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className={styles.formHeader}>
                                    <h2>Recuperar Senha</h2>
                                    <p>Digite seu email para receber o link de recuperação</p>
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

                                    <Button
                                        type="submit"
                                        fullWidth
                                        size="lg"
                                        isLoading={loading}
                                        rightIcon={<FiArrowRight />}
                                    >
                                        Enviar Link de Recuperação
                                    </Button>
                                </form>

                                <div className={styles.divider}>
                                    <span>ou</span>
                                </div>

                                <p className={styles.loginLink}>
                                    Lembrou a senha?{' '}
                                    <Link href="/login">Faça login</Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
