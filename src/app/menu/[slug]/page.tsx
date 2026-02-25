import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import MenuClient from './MenuClient';

// Cache helpers - usamos a instância anônima do supabase (sem cookies) para permitir o cache estático
const getCachedSettings = (slug: string) =>
    unstable_cache(
        async () => {
            const { data } = await supabase
                .from('user_settings')
                .select('*')
                .eq('public_slug', slug)
                .single();
            return data;
        },
        [`menu-settings-${slug}`],
        { tags: [`menu-${slug}`], revalidate: 300 } // 5 minutos TTL + invalidação on-demand
    )();

const getCachedMenu = (userId: string, slug: string) =>
    unstable_cache(
        async () => {
            const [
                { data: categories },
                { data: products },
            ] = await Promise.all([
                supabase
                    .from('categories')
                    .select('*')
                    .eq('user_id', userId)
                    .order('name'),
                supabase
                    .from('products')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('available', true)
                    .order('name'),
            ]);
            return { categories: categories || [], products: products || [] };
        },
        [`menu-data-${userId}`],
        { tags: [`menu-${slug}`], revalidate: 300 }
    )();

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Dynamic metadata based on user settings (cached)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    // unstable_cache garante que não faremos duas chamadas (uma aqui e uma no MenuPage)
    const settings = await getCachedSettings(slug);

    if (!settings) {
        return {
            title: 'Cardápio não encontrado',
            description: 'O cardápio que você está procurando não existe.',
        };
    }

    return {
        title: `${settings.app_name} - Cardápio Digital`,
        description: `Peça online em ${settings.app_name}! Veja nosso cardápio completo e faça seu pedido pelo WhatsApp.`,
        openGraph: {
            title: `${settings.app_name} - Cardápio Digital`,
            description: `Peça online em ${settings.app_name}!`,
            images: settings.logo_url ? [{ url: settings.logo_url }] : [],
        },
    };
}

export default async function MenuPage({ params }: PageProps) {
    const { slug } = await params;

    // Fetch settings (will hit cache se o generateMetadata já tiver rodado)
    const settings = await getCachedSettings(slug);

    if (!settings) {
        notFound();
    }

    // Fetch products and categories (cached)
    const { categories, products } = await getCachedMenu(settings.user_id, slug);

    return (
        <MenuClient
            slug={slug}
            initialSettings={settings}
            initialCategories={categories || []}
            initialProducts={products || []}
        />
    );
}

