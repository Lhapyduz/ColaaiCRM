'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { FiAlertTriangle } from 'react-icons/fi';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service like Sentry or PostHog
        console.error('Ligeirinho Global Error Caught:', error);
    }, [error]);

    return (
        <html lang="pt-BR">
            <body>
                <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6">
                    <div className="max-w-md w-full bg-bg-card border border-border shadow-2xl rounded-2xl p-8 text-center animate-scaleIn">
                        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiAlertTriangle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Algo deu errado!</h2>
                        <p className="text-text-secondary mb-8">
                            Ocorreu um erro inesperado e fatal. Nossa equipe técnica já foi notificada.
                        </p>

                        <div className="flex gap-4 max-[480px]:flex-col">
                            <Button
                                onClick={() => window.location.href = '/'}
                                variant="outline"
                                className="flex-1"
                            >
                                Ir para o Início
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
            </body>
        </html>
    );
}
