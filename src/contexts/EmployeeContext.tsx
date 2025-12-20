'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { verifyPin, isLegacyPin, hashPin } from '@/lib/pinSecurity';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin, formatBlockTime } from '@/lib/rateLimiter';

export interface Employee {
    id: string;
    name: string;
    role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'attendant' | 'delivery';
    permissions: Record<string, boolean>;
    pin_code?: string; // Optional in interface, but required for login
}

interface EmployeeContextType {
    activeEmployee: Employee | null;
    isLocked: boolean;
    loading: boolean;
    loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
    logoutEmployee: () => void;
    lockScreen: () => void;
    unlockScreen: () => void;
    hasPermission: (permission: string) => boolean;
    hasAdmin: boolean;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const [hasAdmin, setHasAdmin] = useState(false);

    // Use ref to store employee data in memory instead of sessionStorage
    const employeeSessionRef = useRef<Employee | null>(null);

    // Check for admin existence
    const checkAdminExistence = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .eq('is_active', true)
            .limit(1);

        if (data && data.length > 0) {
            setHasAdmin(true);
        } else {
            setHasAdmin(false);
        }
    };

    // Load active employee from memory ref on mount
    useEffect(() => {
        // Check if we have a stored lock state
        const storedLocked = sessionStorage.getItem('isLocked');

        if (storedLocked === 'true') {
            setIsLocked(true);
        }

        // Restore from memory ref (not storage for security)
        if (employeeSessionRef.current) {
            setActiveEmployee(employeeSessionRef.current);
        }

        checkAdminExistence();
        setLoading(false);
    }, [user]);

    const loginWithPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Proprietário não autenticado' };
        }

        // Check rate limit first
        const rateLimit = checkRateLimit();
        if (!rateLimit.allowed) {
            const timeRemaining = formatBlockTime(rateLimit.blockRemaining || 0);
            return {
                success: false,
                error: `Muitas tentativas. Aguarde ${timeRemaining}`
            };
        }

        try {
            // Fetch all active employees for this user to compare PINs
            const { data: employees, error } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) {
                return { success: false, error: 'Erro ao buscar funcionários' };
            }

            // Update hasAdmin state based on fetch
            const adminExists = employees?.some(e => e.role === 'admin');
            setHasAdmin(!!adminExists);

            if (!employees || employees.length === 0) {
                return { success: false, error: 'Nenhum funcionário ativo encontrado' };
            }

            // Find employee with matching PIN (supports both hashed and legacy)
            let matchedEmployee = null;

            for (const emp of employees) {
                if (!emp.pin_code) continue;

                const pinMatches = await verifyPin(pin, emp.pin_code);
                if (pinMatches) {
                    matchedEmployee = emp;

                    // If using legacy PIN, upgrade to hashed version
                    if (isLegacyPin(emp.pin_code)) {
                        const hashedPin = await hashPin(pin);
                        await supabase
                            .from('employees')
                            .update({ pin_code: hashedPin })
                            .eq('id', emp.id);
                    }

                    break;
                }
            }

            if (!matchedEmployee) {
                // Record failed attempt
                const result = recordFailedAttempt();
                const remaining = result.remaining;

                if (remaining <= 0 && result.blockRemaining) {
                    return {
                        success: false,
                        error: `Bloqueado. Aguarde ${formatBlockTime(result.blockRemaining)}`
                    };
                }

                return {
                    success: false,
                    error: `PIN inválido. ${remaining} tentativa(s) restante(s)`
                };
            }

            // Success - clear rate limit and set employee
            recordSuccessfulLogin();

            const employee: Employee = {
                id: matchedEmployee.id,
                name: matchedEmployee.name,
                role: matchedEmployee.role,
                permissions: matchedEmployee.permissions || {}
            };

            setActiveEmployee(employee);
            setIsLocked(false);

            // Store in memory ref only (not sessionStorage for security)
            employeeSessionRef.current = employee;
            sessionStorage.setItem('isLocked', 'false');

            return { success: true };
        } catch (err) {
            console.error('Login error', err);
            return { success: false, error: 'Erro ao processar login' };
        }
    };

    const logoutEmployee = () => {
        setActiveEmployee(null);
        setIsLocked(true);
        employeeSessionRef.current = null;
        sessionStorage.setItem('isLocked', 'true');
    };

    const lockScreen = () => {
        // Lock screen logs out employee for security
        logoutEmployee();
    };

    const unlockScreen = () => {
        setIsLocked(false);
        sessionStorage.setItem('isLocked', 'false');
    }

    const hasPermission = (permission: string): boolean => {
        if (isLocked) return false; // No permissions if locked

        // If no employee is logged in, it's the Owner with full access
        if (!activeEmployee) return true;

        // Special case: Admin role has all permissions
        if (activeEmployee.role === 'admin') return true;

        return !!activeEmployee.permissions[permission];
    };

    return (
        <EmployeeContext.Provider value={{
            activeEmployee,
            isLocked,
            loading,
            loginWithPin,
            logoutEmployee,
            lockScreen,
            unlockScreen,
            hasPermission,
            hasAdmin
        }}>
            {children}
        </EmployeeContext.Provider>
    );
}

export function useEmployee() {
    const context = useContext(EmployeeContext);
    if (context === undefined) {
        throw new Error('useEmployee must be used within an EmployeeProvider');
    }
    return context;
}
