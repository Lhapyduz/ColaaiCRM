'use client';

import React, { createContext, ReactNode, useRef } from 'react';
import toast from 'react-hot-toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Mantido para não quebrar dependências de tipos (mesmo vazio)
interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

// Criado apenas para evitar erros se alguém importar o contexto diretamente
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
    children: ReactNode;
}

// Provider mantido vazio apenas para não quebrar a árvore de componentes caso seja importado, mas será removido do layout
export function ToastProvider({ children }: ToastProviderProps) {
    return <>{children}</>;
}

// Funções estáveis de toast — definidas fora do hook para referência única
const toastActions: ToastContextType = {
    toasts: [],
    addToast: (type: ToastType, message: string, duration: number = 4000) => {
        if (type === 'success') toast.success(message, { duration });
        else if (type === 'error') toast.error(message, { duration });
        else if (type === 'warning') toast(message, { duration, icon: '⚠️' });
        else toast(message, { duration, icon: 'ℹ️' });
    },
    removeToast: (id: string) => toast.dismiss(id),
    success: (message: string, duration: number = 4000) => toast.success(message, { duration }),
    error: (message: string, duration: number = 4000) => toast.error(message, { duration }),
    warning: (message: string, duration: number = 4000) => toast(message, { duration, icon: '⚠️' }),
    info: (message: string, duration: number = 4000) => toast(message, { duration, icon: 'ℹ️' })
};

// Hook retorna referência estável (mesma instância em todos os renders)
export function useToast(): ToastContextType {
    const ref = useRef(toastActions);
    return ref.current;
}

export default ToastProvider;
