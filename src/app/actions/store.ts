'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { StoreStatusSchema, DeliveryTimeSchema, StoreRatingSchema, ProductRatingSchema } from '@/lib/schemas';

export async function updateStoreStatus(isOpen: boolean) {
    const validated = StoreStatusSchema.safeParse(isOpen);
    if (!validated.success) throw new Error('Status da loja inválido');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('user_settings')
        .update({ store_open: isOpen })
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/menu');
    revalidatePath('/configuracoes');
}

export async function updateDeliveryTime(min: number, max: number) {
    const validated = DeliveryTimeSchema.safeParse({ min, max });
    if (!validated.success) throw new Error('Tempo de entrega inválido');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('user_settings')
        .update({
            delivery_time_min: min,
            delivery_time_max: max
        })
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/menu');
}

export async function updateSidebarColor(color: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('user_settings')
        .update({ sidebar_color: color })
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/menu');
}

export type OpeningHourInput = {
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
};

export async function saveOpeningHours(hours: OpeningHourInput[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const updates = hours.map(h => ({
        user_id: user.id,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
    }));

    const { error } = await supabase
        .from('opening_hours')
        .upsert(updates, { onConflict: 'user_id,day_of_week' });

    if (error) throw error;
    revalidatePath('/menu');
}

export async function getOpeningHours(userId?: string) {
    const supabase = await createClient();

    let targetUserId = userId;
    if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        targetUserId = user.id;
    }

    const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('user_id', targetUserId)
        .order('day_of_week');

    if (error) throw error;
    return data;
}

export async function addStoreRating(targetUserId: string, rating: number, comment?: string, customerName?: string) {
    const validated = StoreRatingSchema.safeParse({ targetUserId, rating, comment, customerName });
    if (!validated.success) throw new Error('Dados de avaliação da loja inválidos');

    const supabase = await createClient();

    const { error } = await supabase
        .from('store_ratings')
        .insert({
            user_id: targetUserId,
            rating,
            comment,
            customer_name: customerName
        });

    if (error) throw error;
    revalidatePath(`/menu`);
}

export async function addProductRating(targetUserId: string, productId: string, rating: number, comment?: string, customerName?: string) {
    const validated = ProductRatingSchema.safeParse({ targetUserId, productId, rating, comment, customerName });
    if (!validated.success) throw new Error('Dados de avaliação do produto inválidos');

    const supabase = await createClient();

    const { error } = await supabase
        .from('product_ratings')
        .insert({
            user_id: targetUserId,
            product_id: productId,
            rating,
            comment,
            customer_name: customerName
        });

    if (error) throw error;
    revalidatePath(`/menu`);
}

export async function getStoreAnalytics(userId: string) {
    const supabase = await createClient();

    const { data: ratings } = await supabase
        .from('store_ratings')
        .select('rating')
        .eq('user_id', userId)
        .eq('hidden', false);

    if (!ratings || ratings.length === 0) return { average: 0, count: 0 };

    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return {
        average: sum / ratings.length,
        count: ratings.length
    };
}

export async function getProductAnalytics(productId: string) {
    const supabase = await createClient();

    const { data: ratings } = await supabase
        .from('product_ratings')
        .select('rating')
        .eq('product_id', productId)
        .eq('hidden', false);

    if (!ratings || ratings.length === 0) return { average: 0, count: 0 };

    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return {
        average: sum / ratings.length,
        count: ratings.length
    };
}

export async function getRecentRatings(userId: string) {
    const supabase = await createClient();

    const { data: storeRatings } = await supabase
        .from('store_ratings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    const { data: productRatings } = await supabase
        .from('product_ratings')
        .select('*, products(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    return {
        storeRatings: storeRatings || [],
        productRatings: productRatings || []
    };
}

// New Actions for Rating Management

export async function replyToStoreRating(ratingId: string, reply: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('store_ratings')
        .update({ reply, replied_at: new Date().toISOString() })
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
}

export async function replyToProductRating(ratingId: string, reply: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('product_ratings')
        .update({ reply, replied_at: new Date().toISOString() })
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
}

export async function toggleStoreRatingVisibility(ratingId: string, hidden: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('store_ratings')
        .update({ hidden })
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
    revalidatePath('/menu');
}

export async function toggleProductRatingVisibility(ratingId: string, hidden: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('product_ratings')
        .update({ hidden })
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
    revalidatePath('/menu');
}

export async function deleteStoreRating(ratingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('store_ratings')
        .delete()
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
    revalidatePath('/menu');
}

export async function deleteProductRating(ratingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('product_ratings')
        .delete()
        .eq('id', ratingId)
        .eq('user_id', user.id);

    if (error) throw error;
    revalidatePath('/configuracoes');
    revalidatePath('/menu');
}
