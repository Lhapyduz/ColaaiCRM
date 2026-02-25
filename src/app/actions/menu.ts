'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Revalida o cache do menu público da lanchonete do usuário autenticado.
 */
export async function revalidateStoreMenu() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data: settings } = await supabase
        .from('user_settings')
        .select('public_slug')
        .eq('user_id', user.id)
        .single();

    if (settings?.public_slug) {
        // @ts-expect-error tipagem incompatível exigindo 2 argumentos na cache api do next local
        revalidateTag(`menu-${settings.public_slug}`);
        console.log(`[Cache] Revalidated menu for slug: ${settings.public_slug}`);
    }
}
