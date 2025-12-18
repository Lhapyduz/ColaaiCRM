import { Metadata } from 'next';
import RatingClient from './RatingClient';

export const metadata: Metadata = {
    title: 'Avaliar Pedido',
    description: 'Avalie seu pedido e nos ajude a melhorar!',
};

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function RatingPage({ params }: PageProps) {
    const { token } = await params;
    return <RatingClient token={token} />;
}
