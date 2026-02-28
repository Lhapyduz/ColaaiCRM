import { describe, it, expect } from 'vitest';
import {
    sanitizeText,
    escapeHtml,
    sanitizePhoneNumber,
    formatPhoneNumber,
    validateEmail,
    sanitizeSlug,
    validatePassword,
    sanitizeCurrency,
    isValidUUID,
} from '../sanitize';

describe('sanitizeText', () => {
    it('retorna vazio para null/undefined', () => {
        expect(sanitizeText(null)).toBe('');
        expect(sanitizeText(undefined)).toBe('');
    });

    it('remove null bytes', () => {
        expect(sanitizeText('Hello\0World')).toBe('HelloWorld');
    });

    it('preserva texto normal', () => {
        expect(sanitizeText('  Lanche do João  ')).toBe('Lanche do João');
    });

    it('remove caracteres de controle', () => {
        expect(sanitizeText('abc\x01\x02def')).toBe('abcdef');
    });
});

describe('escapeHtml', () => {
    it('retorna vazio para null/undefined', () => {
        expect(escapeHtml(null)).toBe('');
    });

    it('escapa tags HTML', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
    });

    it('escapa aspas e ampersand', () => {
        const result = escapeHtml('Tom & "Jerry"');
        expect(result).toContain('&amp;');
        expect(result).toContain('&quot;');
    });
});

describe('sanitizePhoneNumber', () => {
    it('retorna vazio para null', () => {
        expect(sanitizePhoneNumber(null)).toBe('');
    });

    it('mantém somente dígitos', () => {
        expect(sanitizePhoneNumber('(41) 99561-8116')).toBe('41995618116');
    });
});

describe('formatPhoneNumber', () => {
    it('formata celular (11 dígitos)', () => {
        expect(formatPhoneNumber('41995618116')).toBe('(41) 99561-8116');
    });

    it('formata fixo (10 dígitos)', () => {
        expect(formatPhoneNumber('4132228116')).toBe('(41) 3222-8116');
    });

    it('retorna dígitos se formato desconhecido', () => {
        expect(formatPhoneNumber('123')).toBe('123');
    });
});

describe('validateEmail', () => {
    it('aceita email válido', () => {
        expect(validateEmail('user@example.com').isValid).toBe(true);
    });

    it('rejeita email vazio', () => {
        const result = validateEmail('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('rejeita email sem @', () => {
        expect(validateEmail('userexample.com').isValid).toBe(false);
    });

    it('rejeita email muito longo', () => {
        const longEmail = 'a'.repeat(250) + '@b.com';
        expect(validateEmail(longEmail).isValid).toBe(false);
    });
});

describe('sanitizeSlug', () => {
    it('retorna vazio para null', () => {
        expect(sanitizeSlug(null)).toBe('');
    });

    it('converte para lowercase e troca espaços por hífens', () => {
        expect(sanitizeSlug('Minha Loja Aqui')).toBe('minha-loja-aqui');
    });

    it('remove caracteres especiais', () => {
        expect(sanitizeSlug('hot-dog @#$ legal!')).toBe('hot-dog-legal');
    });

    it('remove hífens consecutivos', () => {
        expect(sanitizeSlug('foo---bar')).toBe('foo-bar');
    });
});

describe('validatePassword', () => {
    it('rejeita senha null', () => {
        const result = validatePassword(null);
        expect(result.isValid).toBe(false);
        expect(result.strength).toBe('weak');
    });

    it('rejeita senha curta (< 8)', () => {
        expect(validatePassword('123').isValid).toBe(false);
    });

    it('aceita senha com 8+ caracteres', () => {
        expect(validatePassword('Senha123!').isValid).toBe(true);
    });

    it('classifica senha forte', () => {
        const result = validatePassword('Minha$enhaForte123!');
        expect(result.strength).toBe('strong');
    });
});

describe('sanitizeCurrency', () => {
    it('retorna 0 para null/undefined', () => {
        expect(sanitizeCurrency(null)).toBe(0);
        expect(sanitizeCurrency(undefined)).toBe(0);
    });

    it('limpa string de moeda brasileira', () => {
        expect(sanitizeCurrency('R$ 45,90')).toBe(45.90);
    });

    it('retorna 0 para valor inválido', () => {
        expect(sanitizeCurrency('abc')).toBe(0);
    });

    it('não permite valores negativos', () => {
        expect(sanitizeCurrency(-10)).toBe(0);
    });

    it('arredonda para 2 casas decimais', () => {
        expect(sanitizeCurrency(10.999)).toBe(11.00);
    });
});

describe('isValidUUID', () => {
    it('aceita UUID v4 válido', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('rejeita string aleatória', () => {
        expect(isValidUUID('not-a-uuid')).toBe(false);
    });

    it('rejeita null/undefined', () => {
        expect(isValidUUID(null)).toBe(false);
        expect(isValidUUID(undefined)).toBe(false);
    });
});
