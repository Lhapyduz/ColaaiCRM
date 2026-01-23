'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    isHydrated: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sidebar-collapsed';

// Safe localStorage read (SSR-safe)
function getInitialCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'true';
    } catch {
        return false;
    }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    // Initialize with localStorage value to prevent flash
    const [collapsed, setCollapsedState] = useState(getInitialCollapsed);
    const [isHydrated, setIsHydrated] = useState(false);

    // Mark as hydrated after first render
    useEffect(() => {
        // Re-sync with localStorage in case SSR value was wrong
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            setCollapsedState(stored === 'true');
        }
        setIsHydrated(true);
    }, []);

    // Persist state to localStorage
    const setCollapsed = useCallback((value: boolean) => {
        setCollapsedState(value);
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
            // localStorage may be unavailable
        }
    }, []);

    const toggleCollapsed = useCallback(() => {
        setCollapsed(!collapsed);
    }, [collapsed, setCollapsed]);

    return (
        <SidebarContext.Provider value={{ collapsed, isHydrated, setCollapsed, toggleCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}


