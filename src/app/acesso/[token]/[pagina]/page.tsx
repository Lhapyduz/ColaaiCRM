'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiLock, FiAlertCircle, FiDelete, FiCoffee, FiTruck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { verifyPin, isLegacyPin, hashPin } from '@/lib/pinSecurity';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin, formatBlockTime } from '@/lib/rateLimiter';
import styles from './page.module.css';

interface EstablishmentData {
    user_id: string;
    app_name: string;
    logo_url: string | null;
    primary_color: string;
}

interface Employee {
    id: string;
    name: string;
    role: string;
    permissions: Record<string, boolean>;
}

const PAGES_CONFIG: Record<string, { title: string; icon: React.ComponentType<any>; requiredRole?: string[] }> = {
    'cozinha': {
        title: 'Cozinha',
        icon: FiCoffee,
        requiredRole: ['admin', 'manager', 'kitchen']
    },
    'entregas': {
        title: 'Entregas',
        icon: FiTruck,
        requiredRole: ['admin', 'manager', 'delivery']
    }
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

    // Validate token and load establishment
    useEffect(() => {
        const loadEstablishment = async () => {
            if (!token || !pagina) {
                setError('Link inválido');
                setLoading(false);
                return;
            }

            if (!pageConfig) {
                setError('Página não encontrada');
                setLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('user_settings')
                    .select('user_id, app_name, logo_url, primary_color')
                    .eq('access_token', token)
                    .single();

                if (fetchError || !data) {
                    setError('Link inválido ou expirado');
                    setLoading(false);
                    return;
                }

                setEstablishment(data);
            } catch (err) {
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        };

        loadEstablishment();
    }, [token, pagina, pageConfig]);

    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            const newPin = pin + digit;
            setPin(newPin);
            setAuthError('');

            if (newPin.length === 4) {
                authenticateWithPin(newPin);
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setAuthError('');
    };

    const authenticateWithPin = async (pinCode: string) => {
        if (!establishment) return;

        setAuthenticating(true);
        setAuthError('');

        // Check rate limit
        const rateLimit = checkRateLimit();
        if (!rateLimit.allowed) {
            const timeRemaining = formatBlockTime(rateLimit.blockRemaining || 0);
            setAuthError(`Muitas tentativas. Aguarde ${timeRemaining}`);
            setAuthenticating(false);
            setPin('');
            return;
        }

        try {
            // Fetch employees for this establishment
            const { data: employees, error: fetchError } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', establishment.user_id)
                .eq('is_active', true);

            if (fetchError || !employees || employees.length === 0) {
                setAuthError('Nenhum funcionário encontrado');
                setAuthenticating(false);
                setPin('');
                return;
            }

            // Find employee with matching PIN
            let matchedEmployee = null;

            for (const emp of employees) {
                if (!emp.pin_code) continue;

                const pinMatches = await verifyPin(pinCode, emp.pin_code);
                if (pinMatches) {
                    matchedEmployee = emp;

                    // Upgrade legacy PIN if needed
                    if (isLegacyPin(emp.pin_code)) {
                        const hashedPin = await hashPin(pinCode);
                        await supabase
                            .from('employees')
                            .update({ pin_code: hashedPin })
                            .eq('id', emp.id);
                    }
                    break;
                }
            }

            if (!matchedEmployee) {
                const result = recordFailedAttempt();
                const remaining = result.remaining;

                if (remaining <= 0 && result.blockRemaining) {
                    setAuthError(`Bloqueado. Aguarde ${formatBlockTime(result.blockRemaining)}`);
                } else {
                    setAuthError(`PIN incorreto. ${remaining} tentativas restantes`);
                }
                setPin('');
                setAuthenticating(false);
                return;
            }

            // Check if employee has permission for this page
            const allowedRoles = pageConfig?.requiredRole || [];
            if (!allowedRoles.includes(matchedEmployee.role)) {
                setAuthError('Você não tem permissão para acessar esta página');
                setPin('');
                setAuthenticating(false);
                return;
            }

            // Success!
            recordSuccessfulLogin();
            setEmployee(matchedEmployee);
            setAuthenticated(true);

        } catch (err) {
            setAuthError('Erro de autenticação');
            setPin('');
        } finally {
            setAuthenticating(false);
        }
    };

    // Apply theme colors
    useEffect(() => {
        if (establishment?.primary_color) {
            document.documentElement.style.setProperty('--primary', establishment.primary_color);
        }

        return () => {
            document.documentElement.style.removeProperty('--primary');
        };
    }, [establishment?.primary_color]);

    // Redirect to view page after authentication
    useEffect(() => {
        if (authenticated && employee && establishment) {
            sessionStorage.setItem('publicAccessEmployee', JSON.stringify(employee));
            sessionStorage.setItem('publicAccessUserId', establishment.user_id);
            sessionStorage.setItem('publicAccessPage', pagina);
            router.push(`/acesso/${token}/${pagina}/view`);
        }
    }, [authenticated, employee, establishment, pagina, token, router]);

    // Loading state
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}>
                    <div className={styles.spinner} />
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <FiAlertCircle className={styles.errorIcon} />
                    <h2>{error}</h2>
                    <p>Verifique o link com o administrador</p>
                </div>
            </div>
        );
    }

    // Authenticated - show loading while redirecting
    if (authenticated && employee) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}>
                    <div className={styles.spinner} />
                    <p>Entrando...</p>
                </div>
            </div>
        );
    }

    const PageIcon = pageConfig?.icon || FiLock;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    {establishment?.logo_url ? (
                        <img src={establishment.logo_url} alt="" className={styles.logo} />
                    ) : (
                        <div className={styles.logoPlaceholder}>
                            <PageIcon size={32} />
                        </div>
                    )}
                    <h1>{establishment?.app_name}</h1>
                    <p className={styles.pageTitle}>
                        <PageIcon size={18} />
                        {pageConfig?.title}
                    </p>
                </div>

                {/* PIN Input */}
                <div className={styles.pinSection}>
                    <p className={styles.pinLabel}>Digite seu PIN</p>

                    <div className={styles.pinDots}>
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`${styles.pinDot} ${i < pin.length ? styles.filled : ''}`}
                            />
                        ))}
                    </div>

                    {authError && (
                        <p className={styles.authError}>{authError}</p>
                    )}
                </div>

                {/* Numpad */}
                <div className={styles.numpad}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                        <button
                            key={key || 'empty'}
                            className={`${styles.numKey} ${key === 'del' ? styles.deleteKey : ''} ${key === '' ? styles.emptyKey : ''}`}
                            onClick={() => {
                                if (key === 'del') handleDelete();
                                else if (key !== '') handlePinInput(key);
                            }}
                            disabled={authenticating || key === ''}
                        >
                            {key === 'del' ? <FiDelete size={24} /> : key}
                        </button>
                    ))}
                </div>

                {authenticating && (
                    <div className={styles.authenticatingOverlay}>
                        <div className={styles.spinner} />
                    </div>
                )}
            </div>
        </div>
    );
}
