'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Shortcut {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    description: string;
    action: () => void;
    scope?: 'global' | 'page';
}

interface KeyboardShortcutsContextType {
    shortcuts: Shortcut[];
    registerShortcut: (shortcut: Shortcut) => void;
    unregisterShortcut: (key: string, ctrl?: boolean, alt?: boolean, shift?: boolean) => void;
    showHelp: boolean;
    setShowHelp: (show: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

const globalShortcuts: Omit<Shortcut, 'action'>[] = [
    { key: 'h', alt: true, description: 'Ir para Dashboard', scope: 'global' },
    { key: 'p', alt: true, description: 'Ir para Pedidos', scope: 'global' },
    { key: 'c', alt: true, description: 'Ir para Cozinha', scope: 'global' },
    { key: 'e', alt: true, description: 'Ir para Estoque', scope: 'global' },
    { key: 'r', alt: true, description: 'Ir para Relatórios', scope: 'global' },
    { key: 'n', alt: true, description: 'Novo Pedido', scope: 'global' },
    { key: '/', ctrl: true, description: 'Mostrar Atalhos', scope: 'global' },
    { key: 'Escape', description: 'Fechar Modal/Menu', scope: 'global' },
];

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // Build global shortcuts with router actions
    useEffect(() => {
        const baseShortcuts: Shortcut[] = [
            { key: 'h', alt: true, description: 'Ir para Dashboard', action: () => router.push('/dashboard'), scope: 'global' },
            { key: 'p', alt: true, description: 'Ir para Pedidos', action: () => router.push('/pedidos'), scope: 'global' },
            { key: 'c', alt: true, description: 'Ir para Cozinha', action: () => router.push('/cozinha'), scope: 'global' },
            { key: 'e', alt: true, description: 'Ir para Estoque', action: () => router.push('/estoque'), scope: 'global' },
            { key: 'r', alt: true, description: 'Ir para Relatórios', action: () => router.push('/relatorios'), scope: 'global' },
            { key: 'n', alt: true, description: 'Novo Pedido', action: () => router.push('/pedidos/novo'), scope: 'global' },
            { key: '/', ctrl: true, description: 'Mostrar Atalhos', action: () => setShowHelp(prev => !prev), scope: 'global' },
            { key: 'Escape', description: 'Fechar Modal/Menu', action: () => setShowHelp(false), scope: 'global' },
        ];
        setShortcuts(baseShortcuts);
    }, [router]);

    const registerShortcut = useCallback((shortcut: Shortcut) => {
        setShortcuts(prev => {
            // Remove existing shortcut with same key combination
            const filtered = prev.filter(s =>
                !(s.key === shortcut.key && s.ctrl === shortcut.ctrl && s.alt === shortcut.alt && s.shift === shortcut.shift)
            );
            return [...filtered, shortcut];
        });
    }, []);

    const unregisterShortcut = useCallback((key: string, ctrl?: boolean, alt?: boolean, shift?: boolean) => {
        setShortcuts(prev =>
            prev.filter(s => !(s.key === key && s.ctrl === ctrl && s.alt === alt && s.shift === shift))
        );
    }, []);

    // Create a Map for O(1) shortcut lookup instead of O(n) find
    const shortcutMap = useMemo(() => {
        const map = new Map<string, Shortcut>();
        shortcuts.forEach(s => {
            // Create composite key: "key-ctrl-alt-shift"
            const compositeKey = `${s.key.toLowerCase()}-${!!s.ctrl}-${!!s.alt}-${!!s.shift}`;
            map.set(compositeKey, s);
        });
        return map;
    }, [shortcuts]);

    // Handle keyboard events - O(1) lookup
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                // Allow Escape to still work
                if (e.key !== 'Escape') return;
            }

            // O(1) lookup using Map with composite key
            const compositeKey = `${e.key.toLowerCase()}-${e.ctrlKey || e.metaKey}-${e.altKey}-${e.shiftKey}`;
            const matchingShortcut = shortcutMap.get(compositeKey);

            if (matchingShortcut) {
                e.preventDefault();
                matchingShortcut.action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcutMap]);

    return (
        <KeyboardShortcutsContext.Provider value={{
            shortcuts,
            registerShortcut,
            unregisterShortcut,
            showHelp,
            setShowHelp
        }}>
            {children}
            {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} shortcuts={shortcuts} />}
        </KeyboardShortcutsContext.Provider>
    );
}

// Shortcuts Help Modal
function ShortcutsHelp({ onClose, shortcuts }: { onClose: () => void; shortcuts: Shortcut[] }) {
    const globalShortcuts = shortcuts.filter(s => s.scope === 'global');
    const pageShortcuts = shortcuts.filter(s => s.scope === 'page');

    const formatKey = (shortcut: Shortcut) => {
        const keys = [];
        if (shortcut.ctrl) keys.push('Ctrl');
        if (shortcut.alt) keys.push('Alt');
        if (shortcut.shift) keys.push('Shift');
        keys.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());
        return keys.join(' + ');
    };

    return (
        <div className="shortcuts-overlay" onClick={onClose}>
            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                <h2>⌨️ Atalhos de Teclado</h2>

                <div className="shortcuts-section">
                    <h3>Navegação Global</h3>
                    <div className="shortcuts-list">
                        {globalShortcuts.map((s, i) => (
                            <div key={i} className="shortcut-item">
                                <kbd>{formatKey(s)}</kbd>
                                <span>{s.description}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {pageShortcuts.length > 0 && (
                    <div className="shortcuts-section">
                        <h3>Atalhos da Página</h3>
                        <div className="shortcuts-list">
                            {pageShortcuts.map((s, i) => (
                                <div key={i} className="shortcut-item">
                                    <kbd>{formatKey(s)}</kbd>
                                    <span>{s.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="shortcuts-footer">
                    <span>Pressione <kbd>Ctrl + /</kbd> para mostrar/esconder</span>
                    <button onClick={onClose}>Fechar</button>
                </div>
            </div>

            <style jsx>{`
                .shortcuts-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    backdrop-filter: blur(4px);
                }

                .shortcuts-modal {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    animation: slideIn 0.2s ease;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0 0 20px 0;
                    color: var(--text-primary);
                }

                .shortcuts-section {
                    margin-bottom: 20px;
                }

                h3 {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin: 0 0 12px 0;
                }

                .shortcuts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .shortcut-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .shortcut-item span {
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }

                kbd {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--primary);
                    min-width: 24px;
                    justify-content: center;
                }

                .shortcuts-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                    margin-top: 8px;
                }

                .shortcuts-footer span {
                    font-size: 0.8125rem;
                    color: var(--text-muted);
                }

                .shortcuts-footer kbd {
                    font-size: 0.6875rem;
                    padding: 2px 6px;
                }

                .shortcuts-footer button {
                    padding: 8px 16px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius-md);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                .shortcuts-footer button:hover {
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}

export function useKeyboardShortcuts() {
    const context = useContext(KeyboardShortcutsContext);
    if (context === undefined) {
        throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
    }
    return context;
}

// Hook to register page-specific shortcuts
export function usePageShortcut(shortcut: Omit<Shortcut, 'scope'>) {
    const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

    useEffect(() => {
        registerShortcut({ ...shortcut, scope: 'page' });
        return () => unregisterShortcut(shortcut.key, shortcut.ctrl, shortcut.alt, shortcut.shift);
    }, [shortcut.key, shortcut.ctrl, shortcut.alt, shortcut.shift]);
}
