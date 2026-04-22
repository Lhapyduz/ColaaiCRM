/**
 * Input Sanitization Library
 * Provides functions to clean and validate user inputs
 */

/**
 * Sanitize text input - removes potentially dangerous characters
 * while preserving normal text content
 */
export function sanitizeText(input: string | null | undefined): string {
    if (!input) return '';

    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Trim whitespace
        .trim();
}

/**
 * Sanitize text for HTML display (escape special characters)
 */
export function escapeHtml(input: string | null | undefined): string {
    if (!input) return '';

    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Sanitize phone number - keeps only digits
 */
export function sanitizePhoneNumber(input: string | null | undefined): string {
    if (!input) return '';

    // Remove everything except digits
    return input.replace(/\D/g, '');
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(input: string | null | undefined): string {
    const digits = sanitizePhoneNumber(input);

    if (digits.length === 11) {
        // Mobile: (XX) XXXXX-XXXX
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        // Landline: (XX) XXXX-XXXX
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return digits;
}

/**
 * Validate email format
 */
export function validateEmail(email: string | null | undefined): { isValid: boolean; error?: string } {
    if (!email || email.trim() === '') {
        return { isValid: false, error: 'Email é obrigatório' };
    }

    // RFC 5322 simplified regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Email inválido' };
    }

    // Check length
    if (email.length > 254) {
        return { isValid: false, error: 'Email muito longo' };
    }

    return { isValid: true };
}

/**
 * Sanitize and validate slug (URL-safe identifier)
 */
export function sanitizeSlug(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .toLowerCase()
        .trim()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove characters that aren't alphanumeric or hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Validate password strength
 */
export function validatePassword(password: string | null | undefined): { isValid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } {
    if (!password) {
        return { isValid: false, error: 'Senha é obrigatória', strength: 'weak' };
    }

    if (password.length < 8) {
        return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres', strength: 'weak' };
    }

    let score = 0;

    // Length bonus
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Common patterns (negative)
    if (/^[a-zA-Z]+$/.test(password)) score -= 1;
    if (/^[0-9]+$/.test(password)) score -= 1;
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated chars

    const strength: 'weak' | 'medium' | 'strong' =
        score >= 5 ? 'strong' :
            score >= 3 ? 'medium' :
                'weak';

    return { isValid: true, strength };
}

/**
 * Sanitize currency value
 */
export function sanitizeCurrency(input: string | number | null | undefined): number {
    if (input === null || input === undefined) return 0;

    if (typeof input === 'number') {
        return Math.max(0, Math.round(input * 100) / 100);
    }

    // Remove currency symbols and spaces
    const cleaned = input.replace(/[R$\s]/g, '').replace(',', '.');
    const value = parseFloat(cleaned);

    if (isNaN(value)) return 0;

    return Math.max(0, Math.round(value * 100) / 100);
}

/**
 * Validate and sanitize UUID
 */
export function isValidUUID(input: string | null | undefined): boolean {
    if (!input) return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input);
}
