/**
 * Rate Limiter Library
 * Provides client-side rate limiting for login attempts
 * Note: This is a defense-in-depth measure - server-side rate limiting
 * should also be implemented when possible
 */

interface RateLimitEntry {
    attempts: number;
    firstAttempt: number;
    blockedUntil: number | null;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

/**
 * Get a unique identifier for the current session/device
 */
function getSessionId(): string {
    // Try to get existing session ID
    let sessionId = sessionStorage.getItem('_rl_session_id');

    if (!sessionId) {
        // Generate new session ID
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('_rl_session_id', sessionId);
    }

    return sessionId;
}

/**
 * Get rate limit entry for a key
 */
function getEntry(key: string): RateLimitEntry {
    const entry = rateLimitStore.get(key);
    const now = Date.now();

    if (!entry) {
        return { attempts: 0, firstAttempt: now, blockedUntil: null };
    }

    // Check if block has expired
    if (entry.blockedUntil && now > entry.blockedUntil) {
        // Reset after block expires
        return { attempts: 0, firstAttempt: now, blockedUntil: null };
    }

    // Check if window has expired
    if (now - entry.firstAttempt > WINDOW_MS && !entry.blockedUntil) {
        // Reset window
        return { attempts: 0, firstAttempt: now, blockedUntil: null };
    }

    return entry;
}

/**
 * Check if a login attempt is allowed
 * @param identifier - Optional custom identifier (defaults to session ID)
 * @returns Object with allowed status, remaining attempts, and block time if blocked
 */
export function checkRateLimit(identifier?: string): {
    allowed: boolean;
    remaining: number;
    blockedUntil: number | null;
    blockRemaining: number | null;
} {
    const key = identifier || getSessionId();
    const entry = getEntry(key);
    const now = Date.now();

    // Check if blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
        return {
            allowed: false,
            remaining: 0,
            blockedUntil: entry.blockedUntil,
            blockRemaining: Math.ceil((entry.blockedUntil - now) / 1000) // seconds
        };
    }

    // Check if within limit
    const remaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);

    return {
        allowed: remaining > 0,
        remaining,
        blockedUntil: null,
        blockRemaining: null
    };
}

/**
 * Record a failed login attempt
 * @param identifier - Optional custom identifier (defaults to session ID)
 * @returns Updated rate limit status
 */
export function recordFailedAttempt(identifier?: string): {
    allowed: boolean;
    remaining: number;
    blockedUntil: number | null;
    blockRemaining: number | null;
} {
    const key = identifier || getSessionId();
    const now = Date.now();
    let entry = getEntry(key);

    // Increment attempts
    entry.attempts += 1;

    // Check if we need to block
    if (entry.attempts >= MAX_ATTEMPTS) {
        entry.blockedUntil = now + BLOCK_DURATION_MS;
    }

    // Store updated entry
    rateLimitStore.set(key, entry);

    const remaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);

    return {
        allowed: remaining > 0 && !entry.blockedUntil,
        remaining,
        blockedUntil: entry.blockedUntil,
        blockRemaining: entry.blockedUntil
            ? Math.ceil((entry.blockedUntil - now) / 1000)
            : null
    };
}

/**
 * Record a successful login (resets the rate limit)
 * @param identifier - Optional custom identifier (defaults to session ID)
 */
export function recordSuccessfulLogin(identifier?: string): void {
    const key = identifier || getSessionId();
    rateLimitStore.delete(key);
}

/**
 * Get remaining block time in human-readable format
 */
export function formatBlockTime(seconds: number): string {
    if (seconds <= 0) return '';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}min ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

/**
 * Clear rate limit for testing purposes (should not be used in production)
 */
export function clearRateLimit(identifier?: string): void {
    if (identifier) {
        rateLimitStore.delete(identifier);
    } else {
        rateLimitStore.clear();
    }
}
