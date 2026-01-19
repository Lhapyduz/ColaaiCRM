'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FiMail, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
            if (error) setError('Erro ao enviar email. Verifique se o email está correto.');
            else setSuccess(true);
        } catch { setError('Ocorreu um erro. Tente novamente.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-5 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/20 blur-[100px]" />
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[30px_30px]" />
            </div>

            <div className="relative z-10 w-full max-w-[450px]">
                <div className="bg-bg-card border border-border rounded-xl p-8 shadow-xl backdrop-blur-sm">
                    <div className="flex flex-col items-center mb-8"><span className="text-5xl mb-2">🌭</span><h1 className="text-2xl font-bold text-primary">Cola Aí</h1></div>

                    {success ? (
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#27ae60]/20 flex items-center justify-center"><FiCheck size={48} className="text-[#27ae60]" /></div>
                            <h2 className="text-xl font-semibold mb-3">Email Enviado!</h2>
                            <p className="text-text-secondary mb-6">Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.</p>
                            <Link href="/login" className="inline-flex items-center gap-2 text-primary font-medium hover:underline"><FiArrowLeft /> Voltar para o Login</Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6"><h2 className="text-xl font-semibold mb-1">Recuperar Senha</h2><p className="text-text-secondary">Digite seu email para receber o link de recuperação</p></div>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                {error && <div className="p-3 bg-error/10 border border-error/30 rounded-md text-error text-sm">{error}</div>}
                                <Input label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<FiMail />} required />
                                <Button type="submit" fullWidth size="lg" isLoading={loading} rightIcon={<FiArrowRight />}>Enviar Link de Recuperação</Button>
                            </form>
                            <div className="relative my-6 text-center"><span className="relative z-10 px-4 bg-bg-card text-text-muted text-sm">ou</span><div className="absolute left-0 right-0 top-1/2 h-px bg-border" /></div>
                            <p className="text-center text-text-secondary">Lembrou a senha? <Link href="/login" className="text-primary font-medium hover:underline">Faça login</Link></p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
