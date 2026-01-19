'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLock, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
        const checkSession = async () => { const { data: { session } } = await supabase.auth.getSession(); if (session) setValidSession(true); setCheckingSession(false); };
        supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') { setValidSession(true); setCheckingSession(false); } });
        checkSession();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) setError('Erro ao redefinir senha. O link pode ter expirado.');
            else { setSuccess(true); setTimeout(() => router.push('/login'), 3000); }
        } catch { setError('Ocorreu um erro. Tente novamente.'); }
        finally { setLoading(false); }
    };

    const BackgroundEffects = () => (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/20 blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[30px_30px]" />
        </div>
    );

    const FormCard = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-background flex items-center justify-center p-5 relative overflow-hidden">
            <BackgroundEffects />
            <div className="relative z-10 w-full max-w-[450px]"><div className="bg-bg-card border border-border rounded-xl p-8 shadow-xl backdrop-blur-sm">{children}</div></div>
        </div>
    );

    if (checkingSession) return <FormCard><div className="flex flex-col items-center py-8"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" /><p className="text-text-secondary">Verificando link...</p></div></FormCard>;

    if (!validSession && !checkingSession) return (
        <FormCard>
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error/20 flex items-center justify-center"><FiAlertCircle size={48} className="text-error" /></div>
                <h2 className="text-xl font-semibold mb-3">Link Inválido</h2>
                <p className="text-text-secondary mb-6">Este link de recuperação expirou ou é inválido. Solicite um novo link de recuperação.</p>
                <Link href="/recuperar-senha" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-md font-medium transition-all hover:bg-primary-hover">Solicitar Novo Link</Link>
            </div>
        </FormCard>
    );

    return (
        <FormCard>
            <div className="flex flex-col items-center mb-8"><span className="text-5xl mb-2">🌭</span><h1 className="text-2xl font-bold text-primary">Cola Aí</h1></div>
            {success ? (
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#27ae60]/20 flex items-center justify-center"><FiCheck size={48} className="text-[#27ae60]" /></div>
                    <h2 className="text-xl font-semibold mb-3">Senha Redefinida!</h2>
                    <p className="text-text-secondary">Sua senha foi alterada com sucesso. Você será redirecionado para o login...</p>
                </div>
            ) : (
                <>
                    <div className="text-center mb-6"><h2 className="text-xl font-semibold mb-1">Redefinir Senha</h2><p className="text-text-secondary">Digite sua nova senha</p></div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {error && <div className="p-3 bg-error/10 border border-error/30 rounded-md text-error text-sm">{error}</div>}
                        <Input label="Nova Senha" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<FiLock />} required />
                        <Input label="Confirmar Nova Senha" type="password" placeholder="Digite a senha novamente" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} leftIcon={<FiLock />} required />
                        <Button type="submit" fullWidth size="lg" isLoading={loading} rightIcon={<FiArrowRight />}>Redefinir Senha</Button>
                    </form>
                </>
            )}
        </FormCard>
    );
}
