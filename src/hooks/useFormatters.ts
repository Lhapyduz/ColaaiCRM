/**
 * Hook centralizado para formatação de valores
 * Elimina duplicação de funções de formatação em múltiplos arquivos
 */

import { useMemo } from 'react';

interface FormattersReturn {
    formatCurrency: (value: number) => string;
    formatCurrencyShort: (value: number) => string;
    formatDate: (date: string | Date) => string;
    formatDateTime: (date: string | Date) => string;
    formatTime: (date: string | Date) => string;
    formatRelativeTime: (date: string | Date) => string;
    formatPhone: (phone: string) => string;
    formatCPF: (cpf: string) => string;
    formatPercentage: (value: number, decimals?: number) => string;
}

// Singleton formatters para evitar recriação
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const currencyShortFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', {
    numeric: 'auto',
});

/**
 * Formata valor para moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

/**
 * Formata valor para moeda brasileira em formato compacto (R$ 1,5K)
 */
export function formatCurrencyShort(value: number): string {
    return currencyShortFormatter.format(value);
}

/**
 * Formata data para formato brasileiro (dd/mm/aaaa)
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateFormatter.format(d);
}

/**
 * Formata data e hora para formato brasileiro (dd/mm/aaaa HH:mm)
 */
export function formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateTimeFormatter.format(d);
}

/**
 * Formata hora para formato brasileiro (HH:mm)
 */
export function formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return timeFormatter.format(d);
}

/**
 * Formata tempo relativo (há 5 minutos, ontem, etc)
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'agora';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return relativeTimeFormatter.format(-minutes, 'minute');
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return relativeTimeFormatter.format(-hours, 'hour');
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return relativeTimeFormatter.format(-days, 'day');
    } else {
        return formatDate(d);
    }
}

/**
 * Formata número de telefone brasileiro
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
}

/**
 * Formata CPF brasileiro
 */
export function formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }

    return cpf;
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Hook que retorna todas as funções de formatação
 * Uso: const { formatCurrency, formatDate } = useFormatters();
 */
export function useFormatters(): FormattersReturn {
    return useMemo(() => ({
        formatCurrency,
        formatCurrencyShort,
        formatDate,
        formatDateTime,
        formatTime,
        formatRelativeTime,
        formatPhone,
        formatCPF,
        formatPercentage,
    }), []);
}

// Export default para compatibilidade
export default useFormatters;
