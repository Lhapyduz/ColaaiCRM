'use client';

import React, { Component, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary global para capturar erros não tratados em componentes React
 * Previne que toda a aplicação quebre por causa de um erro em um componente específico
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // In production, you could send this to an error tracking service like Sentry
        // if (process.env.NODE_ENV === 'production') {
        //     logErrorToService(error, errorInfo);
        // }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Render custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <FiAlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary mb-2">
                        Ops! Algo deu errado
                    </h2>
                    <p className="text-text-secondary mb-6 max-w-md">
                        Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte se o problema persistir.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 max-w-lg text-left">
                            <p className="text-red-400 text-sm font-mono break-all">
                                {this.state.error.message}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-card-hover text-text-primary rounded-lg transition-colors"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Tentar novamente
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                        >
                            Recarregar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook wrapper para usar Error Boundary de forma mais conveniente
 */
interface ErrorBoundaryFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <FiAlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
                Erro ao carregar conteúdo
            </h3>
            <p className="text-sm text-text-secondary mb-4">
                {error.message || 'Um erro inesperado ocorreu'}
            </p>
            <button
                onClick={resetErrorBoundary}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg transition-colors"
            >
                <FiRefreshCw className="w-4 h-4" />
                Tentar novamente
            </button>
        </div>
    );
}

export default ErrorBoundary;
