import { Metadata } from 'next';
import MenuClient from './MenuClient';

export const metadata: Metadata = {
    title: 'Cardápio',
    description: 'Veja nosso cardápio completo e faça seu pedido!',
};

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function MenuPage({ params }: PageProps) {
    const { slug } = await params;
    return <MenuClient slug={slug} />;
}
