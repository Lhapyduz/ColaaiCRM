// src/lib/logger.ts

/**
 * Universal Logger Module
 * Can be hooked into Sentry, PostHog, or Datadog in the future.
 * Currently defaults to console in dev and structured logging in prod if needed.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logger = {
    info: (message: string, meta?: any) => log('info', message, meta),
    warn: (message: string, meta?: any) => log('warn', message, meta),
    error: (error: Error | unknown, message?: string, meta?: any) => logError(error, message, meta),
    debug: (message: string, meta?: any) => log('debug', message, meta),
};

function log(level: LogLevel, message: string, meta?: any) {
    // In production, we could send this to PostHog or an observability tool:
    // if (process.env.NODE_ENV === 'production') {
    //     posthog.capture(message, { level, ...meta });
    // }

    if (process.env.NODE_ENV !== 'production' || level === 'error') {
        const consoleMethod = console[level] || console.log;
        if (meta) {
            consoleMethod(`[${level.toUpperCase()}] ${message}`, meta);
        } else {
            consoleMethod(`[${level.toUpperCase()}] ${message}`);
        }
    }
}

function logError(error: Error | unknown, message?: string, meta?: any) {
    // In production, hook into Sentry:
    // if (process.env.NODE_ENV === 'production') {
    //     Sentry.captureException(error, { extra: { message, ...meta } });
    // }

    console.error(`[ERROR] ${message || 'Unhandled Exception'}:`, error, meta || '');
}
