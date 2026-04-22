import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * This handles conditional classes and removes conflicting Tailwind classes
 * 
 * @example
 * cn('px-2 py-1', condition && 'bg-primary', 'px-4') // px-4 will override px-2
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Utility functions for phone number normalization
 * Ensures consistent phone number format across the app
 */

/**
 * Normalize a phone number by removing all non-digit characters
 * Examples:
 * - "41995618116" -> "41995618116"
 * - "(41)995618116" -> "41995618116"
 * - "41 995618116" -> "41995618116"
 * - "41 9 9561-8116" -> "41995618116"
 * - "+55 41 99561-8116" -> "5541995618116"
 */
export function normalizePhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

/**
 * Format a normalized phone number for display
 * Example: "41995618116" -> "(41) 99561-8116"
 */
export function formatPhone(phone: string): string {
    const normalized = normalizePhone(phone);

    if (normalized.length === 11) {
        // Mobile with DDD: (XX) XXXXX-XXXX
        return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
    } else if (normalized.length === 10) {
        // Landline with DDD: (XX) XXXX-XXXX
        return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
    } else if (normalized.length === 9) {
        // Mobile without DDD: XXXXX-XXXX
        return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
    } else if (normalized.length === 8) {
        // Landline without DDD: XXXX-XXXX
        return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    }

    return phone; // Return original if format not recognized
}

/**
 * Check if a phone number is valid (has enough digits)
 */
export function isValidPhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return normalized.length >= 10 && normalized.length <= 13;
}

/**
 * Format currency in Brazilian Real
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(date));
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}
