'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type PlanType = 'Basico' | 'Avançado' | 'Profissional';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'pending_pix';

export interface Subscription {
    id: string;
    user_id: string;
    plan_type: PlanType;
    status: SubscriptionStatus;
    billing_period: 'monthly' | 'semiannual' | 'annual';
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    stripe_price_id?: string | null;
    stripe_current_period_end?: string | null;
}

// Plan features and limits configuration
const PLAN_LIMITS = {
    Basico: {
        products: 25,
        categories: 5,
        employees: 1,
        addons: 5,
    },
    Avançado: {
        products: 100,
        categories: 15,
        employees: 5,
        addons: Infinity,
    },
    Profissional: {
        products: Infinity,
        categories: Infinity,
        employees: Infinity,
        addons: Infinity,
    }
};

const PLAN_FEATURES = {
    Basico: {
        dashboard: true,
        orders: true,
        products: true,
        categories: true,
        kitchen: false,
        deliveries: false,
        inventory: false,
        loyalty: false,
        coupons: false,
        reports: false,         // Relatórios desabilitados no plano Básico
        exportPdf: false,
        salesPrediction: false,
        digitalMenu: false,
        customization: 'basic',
        bills: false,           // Contas a Pagar/Receber
        cashFlow: false,        // Fluxo de Caixa
        addons: true,           // Adicionais habilitados (com limite de 5)
        actionHistory: false,   // Histórico de ações
    },
    Avançado: {
        dashboard: true,
        orders: true,
        products: true,
        categories: true,
        kitchen: true,
        deliveries: true,
        inventory: true,
        loyalty: true,
        coupons: false,
        reports: 'advanced',
        exportPdf: true,
        salesPrediction: false,
        digitalMenu: true,
        customization: 'full',
        bills: true,
        cashFlow: true,
        addons: true,
        actionHistory: true,
    },
    Profissional: {
        dashboard: true,
        orders: true,
        products: true,
        categories: true,
        kitchen: true,
        deliveries: true,
        inventory: true,
        loyalty: true,
        coupons: true,
        reports: 'full',
        exportPdf: true,
        salesPrediction: true,
        digitalMenu: true,
        customization: 'full',
        bills: true,
        cashFlow: true,
        addons: true,
        actionHistory: true,
    }
};

export type FeatureKey = keyof typeof PLAN_FEATURES.Basico;
type LimitKey = keyof typeof PLAN_LIMITS.Basico;

interface SubscriptionContextType {
    subscription: Subscription | null;
    plan: PlanType;
    loading: boolean;
    isTrialExpired: boolean;
    daysLeftInTrial: number;
    isSubscriptionExpired: boolean;
    isBlocked: boolean;
    daysUntilExpiration: number;
    canAccess: (feature: FeatureKey) => boolean;
    getFeatureValue: (feature: FeatureKey) => boolean | string;
    getLimit: (resource: LimitKey) => number;
    isWithinLimit: (resource: LimitKey, currentCount: number) => boolean;
    getRemainingLimit: (resource: LimitKey, currentCount: number) => number;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSubscription();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [user]);

    const fetchSubscription = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching subscription:', error);
            } else if (data) {
                setSubscription(data);
            } else {
                // No subscription found - user needs to choose a plan via Stripe
                // Don't create automatic trial, let RouteGuard redirect to /assinatura
                setSubscription(null);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('subscription_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Subscription change received:', payload);
                    if (payload.eventType === 'DELETE') {
                        setSubscription(null);
                    } else {
                        setSubscription(payload.new as Subscription);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const refreshSubscription = async () => {
        await fetchSubscription();
    };

    // Get current plan (default to basic if no subscription)
    const plan: PlanType = subscription?.plan_type || 'Basico';

    // Check if trial has expired
    const isTrialExpired: boolean = !!(subscription?.status === 'trial' &&
        subscription.trial_ends_at &&
        new Date(subscription.trial_ends_at) < new Date());

    // Calculate days left in trial
    const daysLeftInTrial = subscription?.status === 'trial' && subscription.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    // Check if subscription period has expired (current_period_end has passed)
    const isSubscriptionExpired: boolean = !!subscription?.current_period_end &&
        new Date(subscription.current_period_end) < new Date() &&
        subscription.status !== 'active' &&
        subscription.status !== 'trial';

    // Calculate days until expiration
    const daysUntilExpiration = subscription?.current_period_end
        ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    // Check if access should be blocked (trial expired OR subscription expired OR status is expired/cancelled/pending_pix)
    const isBlocked: boolean =
        isTrialExpired ||
        isSubscriptionExpired ||
        subscription?.status === 'expired' ||
        subscription?.status === 'cancelled' ||
        subscription?.status === 'pending_pix' ||  // Pix payment awaiting manual activation
        (!subscription && !loading); // No subscription at all (after loading)

    // Check if user can access a feature
    const canAccess = (feature: FeatureKey): boolean => {
        if (isTrialExpired) return false;
        const featureValue = PLAN_FEATURES[plan][feature];
        return featureValue === true || (typeof featureValue === 'string' && featureValue !== 'none');
    };

    // Get feature value (for features with levels like 'basic', 'advanced', 'full')
    const getFeatureValue = (feature: FeatureKey): boolean | string => {
        if (isTrialExpired) return false;
        return PLAN_FEATURES[plan][feature];
    };

    // Get numeric limit for a resource
    const getLimit = (resource: LimitKey): number => {
        return PLAN_LIMITS[plan][resource];
    };

    // Check if current count is within limit
    const isWithinLimit = (resource: LimitKey, currentCount: number): boolean => {
        if (isTrialExpired) return false;
        const limit = getLimit(resource);
        return limit === Infinity || currentCount < limit;
    };

    // Get remaining count before hitting limit
    const getRemainingLimit = (resource: LimitKey, currentCount: number): number => {
        const limit = getLimit(resource);
        if (limit === Infinity) return Infinity;
        return Math.max(0, limit - currentCount);
    };

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            plan,
            loading,
            isTrialExpired,
            daysLeftInTrial,
            isSubscriptionExpired,
            isBlocked,
            daysUntilExpiration,
            canAccess,
            getFeatureValue,
            getLimit,
            isWithinLimit,
            getRemainingLimit,
            refreshSubscription,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}

// Helper function to get plan display name
export function getPlanDisplayName(plan: PlanType): string {
    return plan;
}

// Helper function to get minimum plan for a feature
export function getMinimumPlanForFeature(feature: FeatureKey): PlanType {
    if (PLAN_FEATURES.Basico[feature]) return 'Basico';
    if (PLAN_FEATURES.Avançado[feature]) return 'Avançado';
    return 'Profissional';
}
