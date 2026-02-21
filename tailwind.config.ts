import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // Cores do Design System atual
            colors: {
                primary: {
                    DEFAULT: 'var(--primary)',
                    light: 'var(--primary-light)',
                    dark: 'var(--primary-dark)',
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    light: 'var(--secondary-light)',
                    dark: 'var(--secondary-dark)',
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    light: 'var(--accent-light)',
                    dark: 'var(--accent-dark)',
                },
                success: 'var(--success)',
                warning: 'var(--warning)',
                error: 'var(--error)',
                info: 'var(--info)',
                // Backgrounds (dark theme)
                bg: {
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    tertiary: 'var(--bg-tertiary)',
                    card: 'var(--bg-card)',
                    'card-hover': 'var(--bg-card-hover)',
                    'sidebar': 'var(--sidebar-bg)',
                },
                // Text colors
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                // Border colors
                border: {
                    DEFAULT: 'var(--border-color)',
                    light: 'var(--border-light)',
                },
                // Grays
                gray: {
                    50: '#f8f9fa',
                    100: '#f1f3f5',
                    200: '#e9ecef',
                    300: '#dee2e6',
                    400: '#ced4da',
                    500: '#adb5bd',
                    600: '#868e96',
                    700: '#495057',
                    800: '#343a40',
                    900: '#212529',
                },
            },
            // Border radius
            borderRadius: {
                sm: '6px',
                md: '10px',
                lg: '16px',
                xl: '24px',
            },
            // Box shadows
            boxShadow: {
                sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
                md: '0 4px 6px rgba(0, 0, 0, 0.4)',
                lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
                xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
                glow: '0 0 20px rgba(255, 107, 53, 0.3)',
                'primary-glow': '0 4px 15px rgba(255, 107, 53, 0.3)',
                'primary-glow-lg': '0 6px 20px rgba(255, 107, 53, 0.4)',
            },
            // Spacing (usando o sistema do Tailwind + extras)
            spacing: {
                'sidebar': '280px',
                'sidebar-collapsed': '80px',
                'header': '70px',
            },
            // Font family
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
                manrope: ['Manrope', 'sans-serif'],
            },
            // Transitions
            transitionDuration: {
                fast: '150ms',
                normal: '250ms',
                slow: '400ms',
            },
            // Z-index System Master
            zIndex: {
                hide: '-1',
                auto: 'auto',
                base: '0',
                dropdown: '100',
                sticky: '200',
                overlay: '300',
                modal: '400',
                popover: '500',
                toast: '600',
                tooltip: '700',
            },
            // Animations
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    from: { opacity: '0', transform: 'translateY(-20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    from: { opacity: '0', transform: 'translateX(-20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    from: { opacity: '0', transform: 'translateX(20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 250ms ease',
                fadeInUp: 'fadeInUp 250ms ease',
                fadeInDown: 'fadeInDown 250ms ease',
                slideInLeft: 'slideInLeft 250ms ease',
                slideInRight: 'slideInRight 250ms ease',
                scaleIn: 'scaleIn 250ms ease',
                shimmer: 'shimmer 1.5s infinite',
            },
        },
    },
    plugins: [],
}

export default config
