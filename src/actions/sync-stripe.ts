'use server';

import { subscriptionService } from '@/services/SubscriptionService';

export async function syncStripeData() {
    try {
        const results = await subscriptionService.syncAllSubscriptions();
        console.log('[Sync] Completed:', results);
        return { success: true, ...results };
    } catch (error) {
        console.error('[Sync] Fatal error:', error);
        return { success: false, error: (error as Error).message };
    }
}

