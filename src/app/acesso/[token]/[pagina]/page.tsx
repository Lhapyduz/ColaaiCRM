'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiLock, FiAlertCircle, FiDelete, FiCoffee, FiTruck } from 'react-icons/fi';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { verifyPin, isLegacyPin, hashPin } from '@/lib/pinSecurity';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin, formatBlockTime } from '@/lib/rateLimiter';
import { cn } from '@/lib/utils';

interface EstablishmentData { user_id: string; app_name: string; logo_url: string | null; primary_color: string; }
interface Employee { id: string; name: string; role: string; permissions: Record<string, boolean>; }

const PAGES_CONFIG: Record<string, { title: string; icon: React.ComponentType<any>; requiredRole?: string[] }> = {
    'cozinha': { title: 'Cozinha', icon: FiCoffee, requiredRole: ['admin', 'manager', 'kitchen'] },
    'entregas': { title: 'Entregas', icon: FiTruck, requiredRole: ['admin', 'manager', 'delivery'] }
};

export default function PublicAccessPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const pagina = params.pagina as string;

    const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const [authenticating, setAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [employee, setEmployee] = useState<Employee | null>(null);

    const pageConfig = PAGES_CONFIG[pagina];

    useEffect(() => {
        const loadEstablishment = async () => {
            if (!token || !pagina) { setError('Link inválido'); setLoading(false); return; }
            if (!pageConfig) { setError('Página não encontrada'); setLoading(false); return; }
            try {
                const { data, error: fetchError } = await supabase.from('user_settings').select('user_id, app_name, logo_url, primary_color').eq('access_token', token).single();
                if (fetchError || !data) { setError('Link inválido ou expirado'); setLoading(false); return; }
                setEstablishment(data);
            } catch { setError('Erro ao carregar dados'); } finally { setLoading(false); }
        };
        loadEstablishment();
    }, [token, pagina, pageConfig]);

    const handlePinInput = (digit: string) => { if (pin.length < 4) { const newPin = pin + digit; setPin(newPin); setAuthError(''); if (newPin.length === 4) authenticateWithPin(newPin); } };
    const handleDelete = () => { setPin(prev => prev.slice(0, -1)); setAuthError(''); };

    const authenticateWithPin = async (pinCode: string) => {
        if (!establishment) return;
        setAuthenticating(true); setAuthError('');
        const rateLimit = checkRateLimit();
        if (!rateLimit.allowed) { setAuthError(`Muitas tentativas. Aguarde ${formatBlockTime(rateLimit.blockRemaining || 0)}`); setAuthenticating(false); setPin(''); return; }
        try {
            const { data: employees, error: fetchError } = await supabase.from('employees').select('*').eq('user_id', establishment.user_id).eq('is_active', true);
            if (fetchError || !employees || employees.length === 0) { setAuthError('Nenhum funcionário encontrado'); setAuthenticating(false); setPin(''); return; }
            let matchedEmployee = null;
            for (const emp of employees) {
                if (!emp.pin_code) continue;
                const pinMatches = await verifyPin(pinCode, emp.pin_code);
                if (pinMatches) { matchedEmployee = emp; if (isLegacyPin(emp.pin_code)) { const hashedPin = await hashPin(pinCode); await supabase.from('employees').update({ pin_code: hashedPin }).eq('id', emp.id); } break; }
            }
            if (!matchedEmployee) { const result = recordFailedAttempt(); const remaining = result.remaining; setAuthError(remaining <= 0 && result.blockRemaining ? `Bloqueado. Aguarde ${formatBlockTime(result.blockRemaining)}` : `PIN incorreto. ${remaining} tentativas restantes`); setPin(''); setAuthenticating(false); return; }
            const allowedRoles = pageConfig?.requiredRole || [];
            if (!allowedRoles.includes(matchedEmployee.role)) { setAuthError('Você não tem permissão para acessar esta página'); setPin(''); setAuthenticating(false); return; }
            recordSuccessfulLogin(); setEmployee(matchedEmployee); setAuthenticated(true);
        } catch { setAuthError('Erro de autenticação'); setPin(''); } finally { setAuthenticating(false); }
    };

    useEffect(() => { if (establishment?.primary_color) document.documentElement.style.setProperty('--primary', establishment.primary_color); return () => { document.documentElement.style.removeProperty('--primary'); }; }, [establishment?.primary_color]);
    useEffect(() => { if (authenticated && employee && establishment) { sessionStorage.setItem('publicAccessEmployee', JSON.stringify(employee)); sessionStorage.setItem('publicAccessUserId', establishment.user_id); sessionStorage.setItem('publicAccessPage', pagina); router.push(`/acesso/${token}/${pagina}/view`); } }, [authenticated, employee, establishment, pagina, token, router]);

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex flex-col items-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" /><p className="text-text-secondary">Carregando...</p></div></div>;
    if (error) return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="bg-bg-card border border-border rounded-xl p-8 text-center max-w-sm"><FiAlertCircle className="text-error text-5xl mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">{error}</h2><p className="text-text-secondary">Verifique o link com o administrador</p></div></div>;
    if (authenticated && employee) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex flex-col items-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" /><p className="text-text-secondary">Entrando...</p></div></div>;

    const PageIcon = pageConfig?.icon || FiLock;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border rounded-xl p-8 w-full max-w-[360px] relative overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6">
                    {establishment?.logo_url ? <div className="relative h-16 w-full mx-auto mb-4"><Image src={establishment.logo_url} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 360px" /></div> : <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"><PageIcon size={32} className="text-primary" /></div>}
                    <h1 className="text-xl font-bold">{establishment?.app_name}</h1>
                    <p className="flex items-center justify-center gap-2 text-text-muted mt-1"><PageIcon size={18} /> {pageConfig?.title}</p>
                </div>

                {/* PIN Input */}
                <div className="mb-6">
                    <p className="text-center text-sm text-text-secondary mb-4">Digite seu PIN</p>
                    <div className="flex justify-center gap-3 mb-4">{[0, 1, 2, 3].map((i) => <div key={i} className={cn('w-4 h-4 rounded-full border-2 border-border transition-all', i < pin.length && 'bg-primary border-primary')} />)}</div>
                    {authError && <p className="text-center text-error text-sm">{authError}</p>}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                        <button key={key || 'empty'} className={cn('w-full aspect-square flex items-center justify-center text-xl font-semibold rounded-xl transition-all', key === '' && 'invisible', key === 'del' ? 'bg-transparent text-text-muted hover:text-error' : 'bg-bg-tertiary text-text-primary hover:bg-primary hover:text-white active:scale-95')} onClick={() => { if (key === 'del') handleDelete(); else if (key !== '') handlePinInput(key); }} disabled={authenticating || key === ''}>
                            {key === 'del' ? <FiDelete size={24} /> : key}
                        </button>
                    ))}
                </div>
                {authenticating && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
            </div>
        </div>
    );
}
