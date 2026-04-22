/**
 * Device Fingerprint Library
 * Coleta de fingerprint do navegador para prevenção de fraude
 */

// Gera hash SHA-256 de uma string
async function sha256(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Coleta canvas fingerprint
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        canvas.width = 200;
        canvas.height = 50;

        // Desenha texto com estilo específico
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Cola Aí Fingerprint', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Segurança', 4, 17);

        return canvas.toDataURL();
    } catch {
        return 'canvas-error';
    }
}

// Coleta WebGL fingerprint
function getWebGLFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        return `${vendor}|${renderer}`;
    } catch {
        return 'webgl-error';
    }
}

// Coleta informações do navegador
function getBrowserInfo(): string {
    const nav = window.navigator;
    const screen = window.screen;

    return [
        nav.language || 'unknown',
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        screen.colorDepth || 0,
        screen.width || 0,
        screen.height || 0,
        screen.availWidth || 0,
        screen.availHeight || 0,
        nav.hardwareConcurrency || 0,
        nav.maxTouchPoints || 0,
        nav.cookieEnabled ? 1 : 0,
        nav.doNotTrack || 'unknown',
        Intl.DateTimeFormat().resolvedOptions().locale || 'unknown',
    ].join('|');
}

// Coleta plugins (normalizado)
function getPluginsFingerprint(): string {
    try {
        const plugins = navigator.plugins;
        if (!plugins || plugins.length === 0) return 'no-plugins';

        const pluginList = Array.from(plugins)
            .map(p => p.name)
            .sort()
            .join(',');

        return pluginList.substring(0, 200); // Limita tamanho
    } catch {
        return 'plugins-error';
    }
}

// Coleta fonts disponíveis (simplificado)
function getFontsFingerprint(): string {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
        'Arial', 'Courier New', 'Georgia', 'Times New Roman',
        'Trebuchet MS', 'Verdana', 'Roboto', 'Open Sans'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-fonts';

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const results: string[] = [];

    testFonts.forEach(font => {
        baseFonts.forEach(baseFont => {
            ctx.font = `${testSize} ${baseFont}`;
            const baseWidth = ctx.measureText(testString).width;

            ctx.font = `${testSize} '${font}', ${baseFont}`;
            const testWidth = ctx.measureText(testString).width;

            if (baseWidth !== testWidth) {
                results.push(font);
            }
        });
    });

    return [...new Set(results)].join(',');
}

export interface FingerprintData {
    hash: string;
    components: {
        canvas: string;
        webgl: string;
        browser: string;
        plugins: string;
        fonts: string;
        userAgent: string;
    };
}

/**
 * Gera fingerprint completo do navegador
 * @returns Promise com hash e componentes
 */
export async function generateFingerprint(): Promise<FingerprintData> {
    const components = {
        canvas: getCanvasFingerprint(),
        webgl: getWebGLFingerprint(),
        browser: getBrowserInfo(),
        plugins: getPluginsFingerprint(),
        fonts: getFontsFingerprint(),
        userAgent: navigator.userAgent,
    };

    // Combina todos os componentes em uma string
    const combinedString = [
        components.canvas,
        components.webgl,
        components.browser,
        components.plugins,
        components.fonts,
        // Não inclui userAgent no hash pois muda com updates
    ].join('|||');

    // Gera hash SHA-256
    const hash = await sha256(combinedString);

    return {
        hash,
        components,
    };
}

/**
 * Gera apenas o hash do fingerprint (mais leve)
 * @returns Promise com hash string
 */
export async function getFingerprintHash(): Promise<string> {
    const { hash } = await generateFingerprint();
    return hash;
}

/**
 * Armazena fingerprint no localStorage para cache
 */
export function getCachedFingerprint(): string | null {
    try {
        return localStorage.getItem('_fp_hash');
    } catch {
        return null;
    }
}

export function setCachedFingerprint(hash: string): void {
    try {
        localStorage.setItem('_fp_hash', hash);
    } catch {
        // Ignore storage errors
    }
}

/**
 * Obtém fingerprint com cache
 */
export async function getFingerprint(): Promise<string> {
    // Tenta cache primeiro
    const cached = getCachedFingerprint();
    if (cached) return cached;

    // Gera novo
    const hash = await getFingerprintHash();
    setCachedFingerprint(hash);
    return hash;
}
