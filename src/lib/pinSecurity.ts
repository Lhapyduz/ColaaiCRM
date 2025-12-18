/**
 * PIN Security Library
 * Provides secure hashing and verification for employee PINs
 * Uses Web Crypto API with SHA-256 and salt
 */

// Generate a random salt
export function generateSalt(length: number = 16): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    return Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a PIN with salt using SHA-256
 * Returns format: $sha256$salt$hash
 */
export async function hashPin(pin: string, salt?: string): Promise<string> {
    const pinSalt = salt || generateSalt();
    const pinWithSalt = pinSalt + pin;

    // Use TextEncoder and pass the result directly to digest
    const encoder = new TextEncoder();
    const data = encoder.encode(pinWithSalt);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = arrayBufferToHex(hashBuffer);

    // Return in a format that includes the algorithm, salt, and hash
    return `$sha256$${pinSalt}$${hashHex}`;
}

/**
 * Verify a PIN against a stored hash
 * Returns true if PIN matches, false otherwise
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
    // Handle legacy plain text PINs (for migration)
    if (!storedHash.startsWith('$sha256$')) {
        // Plain text comparison (legacy)
        return pin === storedHash;
    }

    // Parse the stored hash
    const parts = storedHash.split('$');
    if (parts.length !== 4) {
        return false;
    }

    const [, algorithm, salt] = parts;
    if (algorithm !== 'sha256') {
        return false;
    }

    // Hash the provided PIN with the same salt
    const newHash = await hashPin(pin, salt);

    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(newHash, storedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Validate PIN strength
 * Returns object with isValid and optional error message
 */
export function validatePinStrength(pin: string): { isValid: boolean; error?: string } {
    // Must be 4-6 digits
    if (!/^\d{4,6}$/.test(pin)) {
        return { isValid: false, error: 'PIN deve ter entre 4 e 6 dígitos' };
    }

    // No sequential numbers (1234, 4321, etc.)
    const sequential = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321', '3210'];
    for (const seq of sequential) {
        if (pin.includes(seq)) {
            return { isValid: false, error: 'PIN não pode ter sequência numérica' };
        }
    }

    // No repeated digits (1111, 2222, etc.)
    if (/^(\d)\1{3,}$/.test(pin)) {
        return { isValid: false, error: 'PIN não pode ter dígitos repetidos' };
    }

    // Common weak PINs
    const weakPins = ['0000', '1111', '1234', '4321', '0123', '9999', '1212', '7777', '1004', '2000', '4444', '2222', '6969', '6666', '5555', '8888'];
    if (weakPins.includes(pin)) {
        return { isValid: false, error: 'PIN muito comum, escolha outro' };
    }

    return { isValid: true };
}

/**
 * Check if a stored hash is in legacy (plain text) format
 */
export function isLegacyPin(storedHash: string | null): boolean {
    if (!storedHash) return false;
    return !storedHash.startsWith('$sha256$');
}
