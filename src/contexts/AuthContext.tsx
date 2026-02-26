'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isOnline, getAll, saveItem } from '@/lib/offlineStorage';

interface UserSettings {
    id: string;
    user_id: string;
    app_name: string;
    slogan: string | null;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    whatsapp_number: string | null;
    public_slug: string | null;
    pix_key: string | null;
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
    merchant_city: string | null;
    sidebar_order: string[] | null;
    hidden_sidebar_items: string[] | null;
    access_token: string | null;
    delivery_fee_type: 'fixed' | 'neighborhood' | null;
    delivery_fee_value: number | null;
    store_open: boolean | null;
    delivery_time_min: number | null;
    delivery_time_max: number | null;
    sidebar_color: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userSettings: UserSettings | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, name: string, fingerprintHash?: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<{ error: Error | null }>;
    previewSettings: (settings: Partial<UserSettings>) => void;
}

const applyThemeColors = (primary: string, secondary: string, sidebar: string | null) => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (!root) return;

    root.style.setProperty('--primary', primary);

    // Generate RGB values for glow effects
    const hex2rgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    };

    root.style.setProperty('--primary-rgb', hex2rgb(primary));
    root.style.setProperty('--secondary', secondary);

    // Apply sidebar color if provided, otherwise fallback to secondary (default behavior)
    if (sidebar) {
        root.style.setProperty('--sidebar-bg', sidebar);
    } else {
        root.style.setProperty('--sidebar-bg', secondary);
    }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserSettings = useCallback(async (userId: string) => {
        try {
            if (!isOnline()) {
                const cachedSettings = await getAll<UserSettings>('userSettings');
                const userSetting = cachedSettings.find((s) => s.user_id === userId);
                if (userSetting) {
                    setUserSettings(userSetting);
                    applyThemeColors(
                        userSetting.primary_color,
                        userSetting.secondary_color,
                        userSetting.sidebar_color || userSetting.secondary_color
                    );
                }
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Settings not found, create defaults
                    console.log('Creates default settings for existing user');
                    const { data: newSettings, error: insertError } = await supabase
                        .from('user_settings')
                        .insert({
                            user_id: userId,
                            app_name: 'Cola Aí',
                            slogan: null,
                            primary_color: '#ff6b35',
                            secondary_color: '#2d3436',
                            whatsapp_number: null,
                            public_slug: null
                        })
                        .select()
                        .single();

                    if (!insertError && newSettings) {
                        setUserSettings(newSettings);
                        applyThemeColors(
                            newSettings.primary_color,
                            newSettings.secondary_color,
                            newSettings.sidebar_color || newSettings.secondary_color
                        );

                        // Also create default categories if they don't exist
                        const { error: catError } = await supabase.from('categories').insert([
                            { user_id: userId, name: 'Hotdogs', icon: '🌭', color: '#ff6b35' },
                            { user_id: userId, name: 'Porções', icon: '🍟', color: '#fdcb6e' },
                            { user_id: userId, name: 'Bebidas', icon: '🥤', color: '#0984e3' },
                            { user_id: userId, name: 'Combos', icon: '🍔', color: '#00b894' }
                        ]);
                        if (catError) console.error('Error creating default categories:', catError);
                    }
                } else {
                    console.error('Error fetching settings:', error);
                }
                return;
            }

            if (data) {
                await saveItem('userSettings', data);
                setUserSettings(data);
                applyThemeColors(
                    data.primary_color,
                    data.secondary_color,
                    data.sidebar_color || data.secondary_color
                );
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [setUserSettings]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserSettings(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserSettings(session.user.id);
            } else {
                setUserSettings(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchUserSettings, setUser, setSession, setLoading, setUserSettings]);



    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signUp = async (email: string, password: string, name: string, fingerprintHash?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (error) return { error };

            // Create default settings for new user
            if (data.user) {
                await supabase.from('user_settings').insert({
                    user_id: data.user.id,
                    app_name: name || 'Cola Aí',
                    primary_color: '#ff6b35',
                    secondary_color: '#2d3436',
                    whatsapp_number: null,
                    public_slug: null
                });

                // Create default categories
                await supabase.from('categories').insert([
                    { user_id: data.user.id, name: 'Hotdogs', icon: '🌭', color: '#ff6b35' },
                    { user_id: data.user.id, name: 'Porções', icon: '🍟', color: '#fdcb6e' },
                    { user_id: data.user.id, name: 'Bebidas', icon: '🥤', color: '#0984e3' },
                    { user_id: data.user.id, name: 'Combos', icon: '🍔', color: '#00b894' }
                ]);

                // Create trial subscription (7 days)
                const now = new Date();
                const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias

                await supabase.from('subscriptions').insert({
                    user_id: data.user.id,
                    plan_type: 'Profissional', // Trial dá acesso completo
                    status: 'trial',
                    billing_period: 'monthly',
                    trial_ends_at: trialEnd.toISOString(),
                    current_period_start: now.toISOString(),
                    current_period_end: trialEnd.toISOString(),
                    created_from_fingerprint: fingerprintHash || null,
                });

                // Register fingerprint usage (if provided)
                if (fingerprintHash) {
                    try {
                        await fetch('/api/fingerprint/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fingerprintHash,
                                userId: data.user.id,
                                userAgent: navigator.userAgent,
                            }),
                        });
                    } catch (fpError) {
                        console.warn('[SignUp] Failed to register fingerprint:', fpError);
                        // Não bloqueia o cadastro se falhar
                    }
                }
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUserSettings(null);
        // Redirect to login page after logout
        window.location.href = '/login';
    };

    const updateSettings = async (settings: Partial<UserSettings>) => {
        if (!user) return { error: new Error('Not authenticated') };

        try {
            const { error } = await supabase
                .from('user_settings')
                .update(settings)
                .eq('user_id', user.id);

            if (!error) {
                const newSettings = userSettings ? { ...userSettings, ...settings } : null;
                setUserSettings(newSettings);
                if (newSettings) {
                    await saveItem('userSettings', newSettings);
                }

                if (settings.primary_color || settings.secondary_color || settings.sidebar_color) {
                    applyThemeColors(
                        settings.primary_color || userSettings?.primary_color || '#ff6b35',
                        settings.secondary_color || userSettings?.secondary_color || '#2d3436',
                        settings.sidebar_color ?? userSettings?.sidebar_color ?? null
                    );
                }
            }

            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const previewSettings = (settings: Partial<UserSettings>) => {
        // Apply settings locally for real-time preview without saving to database
        setUserSettings(prev => prev ? { ...prev, ...settings } : null);

        // Apply theme colors if they are being changed
        if (settings.primary_color || settings.secondary_color || settings.sidebar_color) {
            applyThemeColors(
                settings.primary_color || userSettings?.primary_color || '#ff6b35',
                settings.secondary_color || userSettings?.secondary_color || '#2d3436',
                settings.sidebar_color ?? userSettings?.sidebar_color ?? null
            );
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            userSettings,
            loading,
            signIn,
            signUp,
            signOut,
            updateSettings,
            previewSettings
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
