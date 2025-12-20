'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type PlanType = 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface Subscription {
    id: string;
    user_id: string;
    plan_type: PlanType;
    status: SubscriptionStatus;
    billing_period: 'monthly' | 'semiannual' | 'annual';
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string;
}

// Plan features and limits configuration
const PLAN_LIMITS = {
    basic: {
        products: 30,
        categories: 5,
        employees: 1,
    },
    professional: {
        products: 100,
        categories: 15,
        employees: 5,
    },
    enterprise: {
        products: Infinity,
        categories: Infinity,
        employees: Infinity,
    }
};

const PLAN_FEATURES = {
    basic: {
        dashboard: true,
        orders: true,
        products: true,
        categories: true,
        kitchen: false,
        deliveries: false,
        inventory: false,
        loyalty: false,
        coupons: false,
        reports: 'basic',
        exportPdf: false,
        salesPrediction: false,
        digitalMenu: false,
        customization: 'basic',
    },
    professional: {
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
    },
    enterprise: {
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
    }
};

type FeatureKey = keyof typeof PLAN_FEATURES.basic;
type LimitKey = keyof typeof PLAN_LIMITS.basic;

interface SubscriptionContextType {
    subscription: Subscription | null;
    plan: PlanType;
    loading: boolean;
    isTrialExpired: boolean;
    daysLeftInTrial: number;
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
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No subscription found, create default trial
                    const now = new Date();
                    const trialEnd = new Date(now);
                    trialEnd.setDate(now.getDate() + 7); // 7 days trial

                    const { data: newSub, error: insertError } = await supabase
                        .from('subscriptions')
                        .insert({
                            user_id: user.id,
                            plan_type: 'professional',
                            status: 'trial',
                            billing_period: 'monthly',
                            trial_ends_at: trialEnd.toISOString(),
                            current_period_start: now.toISOString(),
                            current_period_end: trialEnd.toISOString(),
                        })
                        .select()
                        .single();

                    if (!insertError && newSub) {
                        setSubscription(newSub);
                    }
                } else {
                    console.error('Error fetching subscription:', error);
                }
            } else if (data) {
                setSubscription(data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSubscription = async () => {
        await fetchSubscription();
    };

    // Get current plan (default to basic if no subscription)
    const plan: PlanType = subscription?.plan_type || 'basic';

    // Check if trial has expired
    const isTrialExpired: boolean = !!(subscription?.status === 'trial' &&
        subscription.trial_ends_at &&
        new Date(subscription.trial_ends_at) < new Date());

    // Calculate days left in trial
    const daysLeftInTrial = subscription?.status === 'trial' && subscription.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

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
    const names = {
        basic: 'Básico',
        professional: 'Avançado',
        enterprise: 'Profissional'
    };
    return names[plan];
}

// Helper function to get minimum plan for a feature
export function getMinimumPlanForFeature(feature: FeatureKey): PlanType {
    if (PLAN_FEATURES.basic[feature]) return 'basic';
    if (PLAN_FEATURES.professional[feature]) return 'professional';
    return 'enterprise';
}
