'use client';

import { useEffect } from 'react';

export default function PWARegistry() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // Register immediately — don't wait for 'load' event 
            // because React hydration happens AFTER window load
            navigator.serviceWorker.register('/sw.js').then(
                (registration) => {
                    console.log('SW registered: ', registration.scope);
                },
                (err) => {
                    console.log('SW registration failed: ', err);
                }
            );
        }
    }, []);

    return null;
}
