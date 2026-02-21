'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
    // Inicializa como true apenas no client (SSR retorna false)
    const [mounted] = useState(() => typeof window !== 'undefined');

    if (!mounted) {
        return null; // Prevents hydration root mismatch
    }

    return createPortal(children, document.body);
}
