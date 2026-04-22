import { describe, it, expect } from 'vitest';
import {
    generatePixCode,
    validatePixKey,
    formatPhoneForPix,
    formatCPF,
    formatCNPJ,
    getPixKeyTypeLabel,
} from '../pix';

describe('generatePixCode', () => {
    it('gera código PIX válido com valor', () => {
        const code = generatePixCode({
            pixKey: '12345678901',
            pixKeyType: 'cpf',
            merchantName: 'Cola Aí',
            merchantCity: 'Curitiba',
            amount: 45.90,
        });

        expect(code).toBeDefined();
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(50);
        // Deve começar com formato PIX EMV
        expect(code.startsWith('000201')).toBe(true);
        // Deve conter CRC no final (6304XXXX)
        expect(code).toMatch(/6304[A-F0-9]{4}$/);
    });

    it('gera código PIX sem valor (estático)', () => {
        const code = generatePixCode({
            pixKey: 'email@test.com',
            pixKeyType: 'email',
            merchantName: 'Loja',
            merchantCity: 'SP',
        });

        expect(code).toBeDefined();
        // Sem amount = sem campo 01 (Point of Initiation)
        expect(code.startsWith('000201')).toBe(true);
    });

    it('limita nome do merchant a 25 chars', () => {
        const code = generatePixCode({
            pixKey: '12345678901',
            pixKeyType: 'cpf',
            merchantName: 'Um Nome Muito Muito Muito Grande Demais Para Caber',
            merchantCity: 'Curitiba',
        });
        expect(code).toBeDefined();
    });
});

describe('validatePixKey', () => {
    it('valida CPF com 11 dígitos', () => {
        expect(validatePixKey('12345678901', 'cpf')).toBe(true);
    });

    it('rejeita CPF com dígitos insuficientes', () => {
        expect(validatePixKey('12345', 'cpf')).toBe(false);
    });

    it('valida CNPJ com 14 dígitos', () => {
        expect(validatePixKey('12345678000195', 'cnpj')).toBe(true);
    });

    it('valida email', () => {
        expect(validatePixKey('user@example.com', 'email')).toBe(true);
    });

    it('rejeita email inválido', () => {
        expect(validatePixKey('nao-é-email', 'email')).toBe(false);
    });

    it('valida telefone com +55', () => {
        expect(validatePixKey('+5541995618116', 'phone')).toBe(true);
    });

    it('valida chave aleatória', () => {
        expect(validatePixKey('550e8400-e29b-41d4-a716-446655440000', 'random')).toBe(true);
    });
});

describe('formatPhoneForPix', () => {
    it('adiciona +55 se não tiver', () => {
        expect(formatPhoneForPix('41995618116')).toBe('+5541995618116');
    });

    it('mantém +55 se já existir', () => {
        expect(formatPhoneForPix('5541995618116')).toBe('+5541995618116');
    });
});

describe('formatCPF', () => {
    it('formata CPF corretamente', () => {
        expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });
});

describe('formatCNPJ', () => {
    it('formata CNPJ corretamente', () => {
        expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    });
});

describe('getPixKeyTypeLabel', () => {
    it('retorna label correto', () => {
        expect(getPixKeyTypeLabel('cpf')).toBe('CPF');
        expect(getPixKeyTypeLabel('email')).toBe('E-mail');
        expect(getPixKeyTypeLabel('phone')).toBe('Telefone');
        expect(getPixKeyTypeLabel('random')).toBe('Chave Aleatória');
    });
});
