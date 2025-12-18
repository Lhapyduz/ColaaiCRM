// PIX Integration Utility
// Generates PIX QR Codes following EMV-QRCPS-MPM specification

import QRCode from 'qrcode';

export interface PixPayload {
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    merchantName: string;
    merchantCity: string;
    amount?: number;
    txId?: string;
    description?: string;
}

interface PixConfig {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    merchantCategoryCode?: string;
}

/**
 * CRC16-CCITT calculation for PIX payload
 */
function calculateCRC16(payload: string): string {
    const polynomial = 0x1021;
    let result = 0xFFFF;

    const payloadWithCRC = payload + '6304'; // Add CRC field ID

    for (let i = 0; i < payloadWithCRC.length; i++) {
        result ^= payloadWithCRC.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((result & 0x8000) !== 0) {
                result = (result << 1) ^ polynomial;
            } else {
                result <<= 1;
            }
        }
        result &= 0xFFFF;
    }

    return result.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Create TLV (Type-Length-Value) format
 */
function tlv(id: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
}

/**
 * Format merchant account information for PIX
 */
function formatMerchantAccountInfo(pixKey: string): string {
    // GUI for PIX: br.gov.bcb.pix
    const gui = tlv('00', 'br.gov.bcb.pix');
    const key = tlv('01', pixKey);
    return tlv('26', gui + key);
}

/**
 * Format additional data field
 */
function formatAdditionalData(txId: string): string {
    const reference = tlv('05', txId);
    return tlv('62', reference);
}

/**
 * Generate PIX EMV code (Copia e Cola)
 */
export function generatePixCode(payload: PixPayload): string {
    const {
        pixKey,
        merchantName,
        merchantCity,
        amount,
        txId = '***'
    } = payload;

    // Payload Format Indicator
    let code = tlv('00', '01');

    // Point of Initiation Method (12 for dynamic QR, remove for static)
    if (amount && amount > 0) {
        code += tlv('01', '12');
    }

    // Merchant Account Information
    code += formatMerchantAccountInfo(pixKey);

    // Merchant Category Code
    code += tlv('52', '0000');

    // Transaction Currency (986 = BRL)
    code += tlv('53', '986');

    // Transaction Amount (optional)
    if (amount && amount > 0) {
        const formattedAmount = amount.toFixed(2);
        code += tlv('54', formattedAmount);
    }

    // Country Code
    code += tlv('58', 'BR');

    // Merchant Name (max 25 chars)
    const cleanName = removeAccents(merchantName).substring(0, 25).toUpperCase();
    code += tlv('59', cleanName);

    // Merchant City (max 15 chars)
    const cleanCity = removeAccents(merchantCity).substring(0, 15).toUpperCase();
    code += tlv('60', cleanCity);

    // Additional Data Field (Transaction ID)
    const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';
    code += formatAdditionalData(cleanTxId);

    // CRC16
    const crc = calculateCRC16(code);
    code += `6304${crc}`;

    return code;
}

/**
 * Remove accents from string
 */
function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Generate QR Code as Data URL
 */
export async function generatePixQRCode(payload: PixPayload): Promise<string> {
    const pixCode = generatePixCode(payload);

    try {
        const qrCodeDataUrl = await QRCode.toDataURL(pixCode, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        });
        return qrCodeDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Falha ao gerar QR Code PIX');
    }
}

/**
 * Generate QR Code as SVG string
 */
export async function generatePixQRCodeSVG(payload: PixPayload): Promise<string> {
    const pixCode = generatePixCode(payload);

    try {
        const svg = await QRCode.toString(pixCode, {
            type: 'svg',
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        });
        return svg;
    } catch (error) {
        console.error('Error generating QR code SVG:', error);
        throw new Error('Falha ao gerar QR Code PIX');
    }
}

/**
 * Validate PIX key format
 */
export function validatePixKey(key: string, type: PixPayload['pixKeyType']): boolean {
    switch (type) {
        case 'cpf':
            return /^\d{11}$/.test(key.replace(/\D/g, ''));
        case 'cnpj':
            return /^\d{14}$/.test(key.replace(/\D/g, ''));
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
        case 'phone':
            return /^\+55\d{10,11}$/.test(key) || /^\d{10,11}$/.test(key.replace(/\D/g, ''));
        case 'random':
            return /^[a-f0-9-]{32,36}$/i.test(key);
        default:
            return false;
    }
}

/**
 * Format phone for PIX (add +55 if needed)
 */
export function formatPhoneForPix(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) {
        return `+${digits}`;
    }
    return `+55${digits}`;
}

/**
 * Format CPF for display
 */
export function formatCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format CNPJ for display
 */
export function formatCNPJ(cnpj: string): string {
    const digits = cnpj.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Get PIX key type label
 */
export function getPixKeyTypeLabel(type: PixPayload['pixKeyType']): string {
    const labels = {
        cpf: 'CPF',
        cnpj: 'CNPJ',
        email: 'E-mail',
        phone: 'Telefone',
        random: 'Chave Aleatória'
    };
    return labels[type];
}
