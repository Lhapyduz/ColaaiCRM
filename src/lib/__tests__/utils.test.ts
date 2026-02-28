import { describe, it, expect } from 'vitest';
import {
    normalizePhone,
    formatPhone,
    isValidPhone,
    formatCurrency,
    formatDate,
    formatDateTime,
    cn,
} from '../utils';

describe('normalizePhone', () => {
    it('retorna string vazia para input vazio', () => {
        expect(normalizePhone('')).toBe('');
    });

    it('remove parênteses e espaços', () => {
        expect(normalizePhone('(41)995618116')).toBe('41995618116');
    });

    it('remove traços e espaços', () => {
        expect(normalizePhone('41 9 9561-8116')).toBe('41995618116');
    });

    it('remove +55 mas mantém dígitos', () => {
        expect(normalizePhone('+55 41 99561-8116')).toBe('5541995618116');
    });

    it('não altera número já normalizado', () => {
        expect(normalizePhone('41995618116')).toBe('41995618116');
    });
});

describe('formatPhone', () => {
    it('formata celular com DDD (11 dígitos)', () => {
        expect(formatPhone('41995618116')).toBe('(41) 99561-8116');
    });

    it('formata fixo com DDD (10 dígitos)', () => {
        expect(formatPhone('4132228116')).toBe('(41) 3222-8116');
    });

    it('formata celular sem DDD (9 dígitos)', () => {
        expect(formatPhone('995618116')).toBe('99561-8116');
    });

    it('formata fixo sem DDD (8 dígitos)', () => {
        expect(formatPhone('32228116')).toBe('3222-8116');
    });

    it('retorna original para formato não reconhecido', () => {
        expect(formatPhone('123')).toBe('123');
    });
});

describe('isValidPhone', () => {
    it('aceita 10 dígitos', () => {
        expect(isValidPhone('4132228116')).toBe(true);
    });

    it('aceita 11 dígitos', () => {
        expect(isValidPhone('41995618116')).toBe(true);
    });

    it('aceita 13 dígitos (com +55)', () => {
        expect(isValidPhone('5541995618116')).toBe(true);
    });

    it('rejeita menos de 10 dígitos', () => {
        expect(isValidPhone('12345')).toBe(false);
    });

    it('rejeita mais de 13 dígitos', () => {
        expect(isValidPhone('12345678901234')).toBe(false);
    });
});

describe('formatCurrency', () => {
    it('formata valor inteiro em Real', () => {
        const result = formatCurrency(100);
        expect(result).toContain('100');
        expect(result).toContain('R$');
    });

    it('formata valor decimal', () => {
        const result = formatCurrency(45.9);
        expect(result).toContain('45,90');
    });

    it('formata zero', () => {
        const result = formatCurrency(0);
        expect(result).toContain('0,00');
    });
});

describe('formatDate', () => {
    it('formata data ISO para dd/mm/yyyy', () => {
        const result = formatDate('2026-02-28');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('formata objeto Date', () => {
        const result = formatDate(new Date(2026, 0, 15));
        expect(result).toBe('15/01/2026');
    });
});

describe('formatDateTime', () => {
    it('inclui hora e minuto', () => {
        const result = formatDateTime(new Date(2026, 0, 15, 14, 30));
        expect(result).toContain('15/01/2026');
        expect(result).toContain('14:30');
    });
});

describe('cn', () => {
    it('merge classes simples', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('lida com classes condicionais', () => {
        expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
    });
});
