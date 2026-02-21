'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Opcionalmente podemos travar o scroll se o portal normalmente é um Modal, mas vamos lidar localmente por componente para manter esse Portal genérico.
        return () => setMounted(false);
    }, []);

    if (!mounted) {
        return null; // Prevents hydration root mismatch
    }

    return createPortal(children, document.body);
}
