import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import MenuClient from './MenuClient';

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Dynamic metadata based on user settings
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: settings } = await supabase
        .from('user_settings')
        .select('app_name, logo_url')
        .eq('public_slug', slug)
        .single();

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
    const supabase = await createClient();

    // Fetch settings first
    const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('public_slug', slug)
        .single();

    if (settingsError || !settings) {
        notFound();
    }

    // Fetch all data in parallel for faster load
    const [
        { data: categories },
        { data: products },
    ] = await Promise.all([
        supabase
            .from('categories')
            .select('*')
            .eq('user_id', settings.user_id)
            .order('name'),
        supabase
            .from('products')
            .select('*')
            .eq('user_id', settings.user_id)
            .eq('available', true)
            .order('name'),
    ]);

    return (
        <MenuClient
            slug={slug}
            initialSettings={settings}
            initialCategories={categories || []}
            initialProducts={products || []}
        />
    );
}

