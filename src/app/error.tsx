'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { FiAlertCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Ligeirinho Runtime App Error Caught:', error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-bg-card border border-border shadow-lg rounded-2xl p-8 text-center animate-scaleIn">
                <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiAlertCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold mb-4 text-text-primary">Ops! Tivemos um problema.</h2>
                <p className="text-text-secondary mb-8">
                    Não conseguimos carregar essa parte da aplicação. Tente novamente ou volte para o menu anterior.
                </p>

                <div className="flex gap-4 max-[480px]:flex-col">
                    <Button
                        onClick={() => router.back()}
                        variant="outline"
                        className="flex-1"
                    >
                        Voltar
                    </Button>

                    <Button
                        onClick={() => reset()}
                        className="flex-1"
                    >
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        </div>
    );
}
