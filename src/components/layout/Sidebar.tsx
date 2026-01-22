'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    FiHome,
    FiShoppingBag,
    FiGrid,
    FiClipboard,
    FiTruck,
    FiDollarSign,
    FiBarChart2,
    FiSettings,
    FiLogOut,
    FiChevronLeft,
    FiChevronRight,
    FiMenu,
    FiPackage,
    FiTag,
    FiPercent,
    FiCommand,
    FiGift,
    FiActivity,
    FiFileText,
    FiTrendingUp,
    FiUsers,
    FiCreditCard,
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import PinPadModal from '@/components/auth/PinPadModal';
import { cn } from '@/lib/utils';

interface MenuItem {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}

const MENU_ITEMS: MenuItem[] = [
    { href: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/produtos', icon: FiShoppingBag, label: 'Produtos' },
    { href: '/adicionais', icon: FiTag, label: 'Adicionais' },
    { href: '/categorias', icon: FiGrid, label: 'Categorias' },
    { href: '/pedidos', icon: FiClipboard, label: 'Pedidos' },
    { href: '/cozinha', icon: GiCookingPot, label: 'Cozinha' },
    { href: '/entregas', icon: FiTruck, label: 'Entregas' },
    { href: '/estoque', icon: FiPackage, label: 'Estoque' },
    { href: '/cupons', icon: FiPercent, label: 'Cupons' },
    { href: '/fidelidade', icon: FiGift, label: 'Fidelidade' },
    { href: '/caixa', icon: FiDollarSign, label: 'Caixa' },
    { href: '/contas', icon: FiFileText, label: 'Contas' },
    { href: '/fluxo-caixa', icon: FiTrendingUp, label: 'Fluxo de Caixa' },
    { href: '/funcionarios', icon: FiUsers, label: 'Funcionários' },
    { href: '/relatorios', icon: FiBarChart2, label: 'Relatórios' },
    { href: '/historico', icon: FiActivity, label: 'Histórico' },
    { href: '/assinatura', icon: FiCreditCard, label: 'Assinatura' },
];

// Sortable nav item component
interface SortableNavItemProps {
    item: MenuItem;
    isActive: boolean;
    collapsed: boolean;
    onMobileClose: () => void;
}

function SortableNavItem({ item, isActive, collapsed, onMobileClose }: SortableNavItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.href });

    // Only apply transform/transition during active drag to prevent flash on reorder
    const style = isDragging || transform ? {
        transform: CSS.Transform.toString(transform),
        transition,
    } : undefined;

    const Icon = item.icon;

    return (
        <Link
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            href={item.href}
            className={cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-colors duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                'hover:bg-bg-tertiary hover:text-text-primary',
                isActive && 'bg-primary/10 text-primary',
                isDragging && 'opacity-50 bg-bg-tertiary',
                collapsed && 'justify-center px-3.5'
            )}
            onClick={(e) => {
                if (isDragging) {
                    e.preventDefault();
                    return;
                }
                onMobileClose();
            }}
        >
            <Icon className="text-xl shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
            {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-r-sm" />
            )}
        </Link>
    );
}

// Overlay item (shown while dragging)
interface OverlayItemProps {
    item: MenuItem;
    collapsed: boolean;
}

function OverlayItem({ item, collapsed }: OverlayItemProps) {
    const Icon = item.icon;
    return (
        <div className="relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary opacity-95 bg-bg-card shadow-lg border border-primary cursor-grabbing">
            <Icon className="text-xl shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
        </div>
    );
}

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showPinPad, setShowPinPad] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    // Temporary local override during drag operations - cleared after context syncs
    const [localOrderOverride, setLocalOrderOverride] = useState<MenuItem[] | null>(null);
    const navRef = useRef<HTMLElement>(null);
    const pathname = usePathname();
    const { userSettings, signOut, updateSettings } = useAuth();
    const { setShowHelp } = useKeyboardShortcuts();

    // Employee Context
    const { activeEmployee, logoutEmployee, loginWithPin, hasPermission, isLocked, lockScreen, unlockScreen, hasAdmin } = require('@/contexts/EmployeeContext').useEmployee();

    const appName = userSettings?.app_name || 'Cola Aí';

    // Derive ordered items from userSettings (source of truth)
    const contextOrderedItems = useMemo(() => {
        if (userSettings?.sidebar_order && userSettings.sidebar_order.length > 0) {
            const savedOrder = userSettings.sidebar_order;
            const reordered = savedOrder
                .map((href: string) => MENU_ITEMS.find(item => item.href === href))
                .filter((item): item is MenuItem => item !== undefined);

            // Add any new menu items that weren't in the saved order
            const missingItems = MENU_ITEMS.filter(
                item => !savedOrder.includes(item.href)
            );

            return [...reordered, ...missingItems];
        }
        return MENU_ITEMS;
    }, [userSettings?.sidebar_order]);

    // Use local override during drag, otherwise use context-derived order
    const orderedItems = localOrderOverride ?? contextOrderedItems;

    // Clear local override only when context has synced with our changes
    useEffect(() => {
        if (!localOrderOverride) return;

        // Only clear the override if context now matches our saved order
        const contextOrder = userSettings?.sidebar_order;
        if (contextOrder && contextOrder.length > 0) {
            const overrideHrefs = localOrderOverride.map(item => item.href);
            const contextHrefs = contextOrder as string[];

            // Check if orders match (context has synced with our save)
            const ordersMatch = overrideHrefs.length === contextHrefs.length &&
                overrideHrefs.every((href, index) => href === contextHrefs[index]);

            if (ordersMatch) {
                setLocalOrderOverride(null);
            }
        }
    }, [userSettings?.sidebar_order, localOrderOverride]);

    // Hydration safety - only enable DnD after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);
    // Preserve sidebar scroll position across navigations
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        // Restore scroll position on mount/navigation
        const savedScroll = sessionStorage.getItem('sidebar-scroll');
        if (savedScroll) {
            nav.scrollTop = parseInt(savedScroll, 10);
        }

        // Save scroll position before navigation
        const handleScroll = () => {
            sessionStorage.setItem('sidebar-scroll', String(nav.scrollTop));
        };

        nav.addEventListener('scroll', handleScroll);
        return () => nav.removeEventListener('scroll', handleScroll);
    }, [pathname]);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 1000,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filter out hidden items
    const visibleMenuItems = useMemo(() => {
        const hiddenItems = userSettings?.hidden_sidebar_items || [];
        return orderedItems.filter(item => !hiddenItems.includes(item.href));
    }, [userSettings?.hidden_sidebar_items, orderedItems]);

    // Filter menu items based on permissions
    const filteredMenuItems = visibleMenuItems.filter(item => {
        const path = item.href.replace('/', '');

        if (path === 'dashboard') return true;
        if (!activeEmployee) return true;

        const permissionMap: Record<string, string> = {
            'produtos': 'products',
            'adicionais': 'products',
            'categorias': 'categories',
            'pedidos': 'orders',
            'cozinha': 'orders',
            'entregas': 'orders',
            'estoque': 'products',
            'cupons': 'settings',
            'fidelidade': 'customers',
            'caixa': 'finance',
            'contas': 'finance',
            'fluxo-caixa': 'finance',
            'funcionarios': 'employees',
            'relatorios': 'reports',
            'historico': 'reports',
            'configuracoes': 'settings'
        };

        const requiredPerm = permissionMap[path];
        if (!requiredPerm) return true;

        return hasPermission(requiredPerm);
    });

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const currentOrder = localOrderOverride ?? contextOrderedItems;
            const oldIndex = currentOrder.findIndex(item => item.href === active.id);
            const newIndex = currentOrder.findIndex(item => item.href === over.id);

            const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

            // Set local override immediately for smooth UX
            setLocalOrderOverride(newOrder);

            try {
                const newOrderHrefs = newOrder.map(item => item.href);
                const { error } = await updateSettings({ sidebar_order: newOrderHrefs });

                if (error) {
                    console.error('Error saving sidebar order:', error);
                    // Rollback: clear override to revert to context
                    setLocalOrderOverride(null);
                }
                // On success, the useEffect will clear override when context syncs
            } catch (error) {
                console.error('Error saving sidebar order:', error);
                // Rollback: clear override to revert to context
                setLocalOrderOverride(null);
            }
        }
    };

    const handleEmployeeLogout = () => {
        logoutEmployee();
    };

    const handleLockScreen = () => {
        lockScreen();
    };

    const handlePinSuccess = async (pin: string) => {
        const result = await loginWithPin(pin);
        if (result.success) {
            setShowPinPad(false);
            return true;
        }
        return false;
    };

    const activeItem = activeId ? orderedItems.find(item => item.href === activeId) : null;

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="hidden max-md:flex fixed top-4 left-4 w-11 h-11 bg-bg-card border border-border rounded-md text-text-primary text-xl items-center justify-center cursor-pointer z-sticky"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            >
                <FiMenu />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="hidden max-md:block fixed inset-0 bg-black/50 z-[calc(var(--z-sticky)-1)]"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={cn(
                'fixed top-0 left-0 h-screen w-sidebar bg-bg-secondary border-r border-border flex flex-col z-sticky transition-[width] duration-normal',
                collapsed && 'w-sidebar-collapsed',
                'max-md:-translate-x-full max-md:w-sidebar',
                mobileOpen && 'max-md:translate-x-0'
            )}>
                {/* Header */}
                <div className="p-5 border-b border-border">
                    <Link href="/dashboard" className="flex items-center gap-3 no-underline">
                        {userSettings?.logo_url ? (
                            <img
                                src={userSettings.logo_url}
                                alt=""
                                aria-hidden="true"
                                className="w-10 h-10 rounded-md object-cover"
                            />
                        ) : (
                            <span className="text-[2rem]">🌭</span>
                        )}
                        {!collapsed && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xl font-bold bg-linear-to-br from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">
                                    {appName}
                                </span>
                                {activeEmployee && (
                                    <span className="text-xs text-text-muted font-normal">
                                        {activeEmployee.name}
                                    </span>
                                )}
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation with Drag and Drop */}
                <nav
                    ref={navRef}
                    className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto overscroll-contain touch-pan-y"
                >
                    {isMounted ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredMenuItems.map(item => item.href)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredMenuItems.map((item) => (
                                    <SortableNavItem
                                        key={item.href}
                                        item={item}
                                        isActive={pathname === item.href}
                                        collapsed={collapsed}
                                        onMobileClose={() => setMobileOpen(false)}
                                    />
                                ))}
                            </SortableContext>
                            <DragOverlay>
                                {activeItem ? (
                                    <OverlayItem item={activeItem} collapsed={collapsed} />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        filteredMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                                        'hover:bg-bg-tertiary hover:text-text-primary',
                                        isActive && 'bg-primary/10 text-primary',
                                        collapsed && 'justify-center px-3.5'
                                    )}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <Icon className="text-xl shrink-0" />
                                    {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
                                    {isActive && !collapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-r-sm" />
                                    )}
                                </Link>
                            );
                        })
                    )}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border flex flex-col gap-1">
                    {((!activeEmployee && !hasPermission('settings')) === false) && hasPermission('settings') && (
                        <Link
                            href="/configuracoes"
                            className={cn(
                                'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                                'hover:bg-bg-tertiary hover:text-text-primary',
                                pathname === '/configuracoes' && 'bg-primary/10 text-primary',
                                collapsed && 'justify-center px-3.5'
                            )}
                            onClick={() => setMobileOpen(false)}
                        >
                            <FiSettings className="text-xl shrink-0" />
                            {!collapsed && <span className="whitespace-nowrap overflow-hidden">Configurações</span>}
                        </Link>
                    )}

                    {activeEmployee ? (
                        <div className="flex flex-col gap-1">
                            <button
                                className={cn(
                                    'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                                    'hover:bg-bg-tertiary hover:text-text-primary',
                                    collapsed && 'justify-center px-3.5'
                                )}
                                onClick={handleEmployeeLogout}
                                title="Sair do Funcionário"
                            >
                                <FiLogOut className="text-xl shrink-0" />
                                {!collapsed && <span className="whitespace-nowrap overflow-hidden">
                                    Sair ({activeEmployee.name.split(' ')[0]})
                                </span>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                className={cn(
                                    'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                                    'hover:bg-bg-tertiary hover:text-text-primary',
                                    collapsed && 'justify-center px-3.5'
                                )}
                                onClick={handleLockScreen}
                                title="Bloquear Tela"
                            >
                                <FiUsers className="text-xl shrink-0" />
                                {!collapsed && <span className="whitespace-nowrap overflow-hidden">Bloquear Tela</span>}
                            </button>
                            <button
                                className={cn(
                                    'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                                    'hover:bg-bg-tertiary hover:text-text-primary',
                                    collapsed && 'justify-center px-3.5'
                                )}
                                onClick={signOut}
                                title="Sair do Sistema"
                            >
                                <FiLogOut className="text-xl shrink-0" />
                                {!collapsed && <span className="whitespace-nowrap overflow-hidden">Sair</span>}
                            </button>
                        </>
                    )}

                    <button
                        className={cn(
                            'relative flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary no-underline transition-all duration-fast cursor-pointer border-none bg-transparent w-full text-[0.9375rem]',
                            'hover:bg-bg-tertiary hover:text-text-primary',
                            'mt-2 border-t border-border pt-3',
                            collapsed && 'justify-center px-3.5'
                        )}
                        onClick={() => setShowHelp(true)}
                        title="Atalhos de Teclado (Ctrl + /)"
                    >
                        <FiCommand className="text-xl shrink-0" />
                        {!collapsed && (
                            <span className="flex items-center justify-between gap-2 flex-1 whitespace-nowrap overflow-hidden">
                                Atalhos
                                <kbd className="font-mono text-[0.6875rem] px-1.5 py-0.5 bg-bg-tertiary border border-border rounded text-text-secondary ml-auto">Ctrl+/</kbd>
                            </span>
                        )}
                    </button>
                </div>

                {/* Collapse Toggle */}
                <button
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-bg-secondary border border-border rounded-full flex items-center justify-center text-text-secondary cursor-pointer transition-all duration-fast z-10 hover:bg-bg-tertiary hover:text-text-primary max-md:hidden"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                >
                    {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </aside>

            {/* Pin Pad Modal Component */}
            <PinPadModal
                isOpen={showPinPad || isLocked}
                onClose={() => !isLocked && setShowPinPad(false)}
                onSuccess={handlePinSuccess}
                onSignOutOwner={signOut}
                title={isLocked ? "Tela Bloqueada" : "Trocar Usuário"}
                isLocked={isLocked}
                onBack={!hasAdmin ? unlockScreen : undefined}
            />
        </>
    );
}
