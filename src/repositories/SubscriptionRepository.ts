import { supabaseAdmin } from '@/lib/supabase-admin';

export class SubscriptionRepository {
  async upsertSubscriptionCache(record: any) {
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

  async upsertSubscription(subRecord: any) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(subRecord, { onConflict: 'user_id' });
      
    if (error) throw new Error(`[Sync] Error upserting subscription: ${error.message}`);
  }
}

export const subscriptionRepository = new SubscriptionRepository();
