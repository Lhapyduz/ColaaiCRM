import { supabaseAdmin } from '@/lib/supabase-admin';

export interface SubscriptionCacheRecord {
  id: string;
  user_id: string | null;
  status: string;
  plan_name: string;
  amount_cents: number;
  current_period_end: string;
  tenant_id: string | null;
  created_at: string;
}

export interface SubscriptionRecord {
  user_id: string;
  plan_type: 'Basico' | 'Avançado' | 'Profissional';
  status: string;
  billing_period: 'monthly' | 'semiannual' | 'annual';
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id?: string;
  updated_at: string;
  payment_method: string;
}

export class SubscriptionRepository {
  async upsertSubscriptionCache(record: SubscriptionCacheRecord) {
    const { error } = await supabaseAdmin
      .from('subscriptions_cache')
      .upsert(record);
      
    if (error) throw new Error(`[Sync] Error upserting cache: ${error.message}`);
  }

  async getManualSubscription(userId: string) {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  }

  async upsertSubscription(subRecord: SubscriptionRecord) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(subRecord, { onConflict: 'user_id' });
      
    if (error) throw new Error(`[Sync] Error upserting subscription: ${error.message}`);
  }
}

export const subscriptionRepository = new SubscriptionRepository();
