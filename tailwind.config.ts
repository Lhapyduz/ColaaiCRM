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
                    DEFAULT: '#ff6b35',
                    light: '#ff8c5a',
                    dark: '#e55a2b',
                },
                secondary: {
                    DEFAULT: '#2d3436',
                    light: '#636e72',
                    dark: '#1e2224',
                },
                accent: {
                    DEFAULT: '#00b894',
                    light: '#55efc4',
                    dark: '#00a381',
                },
                success: '#00b894',
                warning: '#fdcb6e',
                error: '#e74c3c',
                info: '#0984e3',
                // Backgrounds (dark theme)
                bg: {
                    primary: '#0f0f0f',
                    secondary: '#1a1a1a',
                    tertiary: '#252525',
                    card: '#1e1e1e',
                    'card-hover': '#2a2a2a',
                },
                // Text colors
                text: {
                    primary: '#ffffff',
                    secondary: '#b0b0b0',
                    muted: '#6b6b6b',
                },
                // Border colors
                border: {
                    DEFAULT: '#333333',
                    light: '#404040',
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
            // Z-index
            zIndex: {
                dropdown: '100',
                sticky: '200',
                modal: '300',
                toast: '400',
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
