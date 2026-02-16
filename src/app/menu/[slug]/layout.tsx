import { Metadata } from 'next';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    return {
        manifest: `/api/manifest/${slug}`,
    };
}

export default function MenuLayout({ children }: LayoutProps) {
    return <>{children}</>;
}
