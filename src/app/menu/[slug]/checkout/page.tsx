import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CheckoutClient from './CheckoutClient';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: settings } = await supabase
        .from('user_settings')
        .select('app_name, logo_url')
        .eq('public_slug', slug)
        .single();

    if (!settings) {
        return { title: 'Checkout não encontrado' };
    }

    return {
        title: `Checkout - ${settings.app_name}`,
        description: `Finalize seu pedido em ${settings.app_name}.`,
    };
}

export default async function CheckoutPage({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('public_slug', slug)
        .single();

    if (settingsError || !settings) {
        notFound();
    }

    const { data: appSettings } = await supabase
        .from('app_settings')
        .select('coupons_enabled')
        .eq('user_id', settings.user_id)
        .single();

    return (
        <CheckoutClient
            slug={slug}
            settings={settings}
            couponsEnabled={appSettings?.coupons_enabled ?? false}
        />
    );
}
