'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLock, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';

export default function RedefinirSenhaPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validSession, setValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check if user has a valid recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setValidSession(true);
            }
            setCheckingSession(false);
        };

        // Handle the auth callback from the email link
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setValidSession(true);
                setCheckingSession(false);
            }
        });

        checkSession();
    }, []);

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
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError('Erro ao redefinir senha. O link pode ter expirado.');
            } else {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            }
        } catch {
            setError('Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
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
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <p>Verificando link...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!validSession && !checkingSession) {
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
                            <div className={styles.errorState}>
                                <div className={styles.errorIcon}>
                                    <FiAlertCircle size={48} />
                                </div>
                                <h2>Link Inválido</h2>
                                <p>
                                    Este link de recuperação expirou ou é inválido.
                                    Solicite um novo link de recuperação.
                                </p>
                                <Link href="/recuperar-senha" className={styles.actionButton}>
                                    Solicitar Novo Link
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                <h2>Senha Redefinida!</h2>
                                <p>
                                    Sua senha foi alterada com sucesso.
                                    Você será redirecionado para o login...
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.formHeader}>
                                    <h2>Redefinir Senha</h2>
                                    <p>Digite sua nova senha</p>
                                </div>

                                <form onSubmit={handleSubmit} className={styles.form}>
                                    {error && <div className={styles.error}>{error}</div>}

                                    <Input
                                        label="Nova Senha"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        leftIcon={<FiLock />}
                                        required
                                    />

                                    <Input
                                        label="Confirmar Nova Senha"
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
                                        Redefinir Senha
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
