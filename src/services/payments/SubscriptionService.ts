import { stripe } from '@/services/payments/stripe';
import { supabaseAdmin } from '@/infra/persistence/supabase-admin';
import Stripe from 'stripe';
import { subscriptionRepository } from '@/repositories/SubscriptionRepository';

export class SubscriptionService {
  async syncAllSubscriptions() {
    console.log('[Sync] Starting full Stripe sync...');
    const results = { subscriptions: 0, errors: 0, matched_users: 0 };
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
        const paginatedSubscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
            limit: 100,
            status: 'all',
            expand: ['data.plan.product'],
            starting_after: startingAfter,
        });

        if (paginatedSubscriptions.data.length === 0) break;

        console.log(`[Sync] Processing ${paginatedSubscriptions.data.length} subscriptions...`);

        for (const sub of paginatedSubscriptions.data) {
            try {
                const matched = await this.processSubscription(sub);
                results.subscriptions++;
                if (matched) results.matched_users++;
            } catch (err) {
                console.error('[Sync] Error processing sub:', sub.id, err);
                results.errors++;
            }
        }

        hasMore = paginatedSubscriptions.has_more;
        if (hasMore) {
            startingAfter = paginatedSubscriptions.data[paginatedSubscriptions.data.length - 1].id;
        }
    }

    return results;
  }

  private async processSubscription(sub: Stripe.Subscription) {
      const subCast = sub as unknown as Stripe.Subscription & { current_period_start: number, current_period_end: number, plan?: { amount: number, product: unknown, interval: string, id: string } };
      const userId = subCast.metadata?.userId;
      let validUserId = null;

      // Verify user ID in auth system
      if (userId) {
          const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (user && !error) validUserId = user.id;
      }

      // Prepare record
      const amount = subCast.items.data[0]?.price?.unit_amount || subCast.plan?.amount || 0;
      const planName = (subCast.plan?.product as { name?: string })?.name || 'Desconhecido';

      const cacheRecord = {
          id: subCast.id,
          user_id: validUserId,
          status: subCast.status,
          plan_name: planName,
          amount_cents: amount,
          current_period_end: new Date(subCast.current_period_end * 1000).toISOString(),
          tenant_id: validUserId,
          created_at: new Date(subCast.created * 1000).toISOString()
      };

      await subscriptionRepository.upsertSubscriptionCache(cacheRecord);

      if (validUserId) {
          const planType = this.mapPlanType(planName);
          const interval = subCast.plan?.interval || 'month';

          const existingSub = await subscriptionRepository.getManualSubscription(validUserId);
          const isManualActive = existingSub?.payment_method === 'manual' && existingSub?.status === 'active';
          const isStripeCanceled = subCast.status === 'canceled';

          if (!isManualActive || !isStripeCanceled) {
              const subRecord = {
                  user_id: validUserId,
                  plan_type: planType,
                  status: subCast.status,
                  billing_period: this.mapInterval(interval),
                  current_period_start: new Date(subCast.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subCast.current_period_end * 1000).toISOString(),
                  stripe_customer_id: subCast.customer as string,
                  stripe_subscription_id: subCast.id,
                  stripe_price_id: subCast.plan?.id,
                  updated_at: new Date().toISOString(),
                  payment_method: 'card'
              };

              await subscriptionRepository.upsertSubscription(subRecord);
          }
      }
      
      return !!validUserId;
  }

  private mapPlanType(name: string): 'Basico' | 'Avançado' | 'Profissional' {
      const n = name.toLowerCase();
      if (n.includes('basico') || n.includes('básico')) return 'Basico';
      if (n.includes('avancado') || n.includes('avançado')) return 'Avançado';
      if (n.includes('profissional')) return 'Profissional';
      return 'Basico';
  }

  private mapInterval(interval: string): 'monthly' | 'semiannual' | 'annual' {
      if (interval === 'year') return 'annual';
      if (interval === 'month') return 'monthly';
      return 'monthly';
  }
}

export const subscriptionService = new SubscriptionService();
