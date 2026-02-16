'use client';

import { useEffect } from 'react';

export default function PWARegistry() {
    useEffect(() => {
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('SW registered: ', registration);
                    },
                    (err) => {
                        console.log('SW registration failed: ', err);
                    }
                );
            });
        }
    }, []);

    return null;
}
