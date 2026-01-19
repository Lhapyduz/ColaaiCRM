'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
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
import styles from './Sidebar.module.css';

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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = item.icon;

    return (
        <Link
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
            onClick={(e) => {
                // Prevent navigation if dragging
                if (isDragging) {
                    e.preventDefault();
                    return;
                }
                onMobileClose();
            }}
        >
            <Icon className={styles.navIcon} />
            {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            {isActive && <div className={styles.activeIndicator} />}
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
        <div className={`${styles.navItem} ${styles.dragOverlay}`}>
            <Icon className={styles.navIcon} />
            {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
        </div>
    );
}

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showPinPad, setShowPinPad] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [orderedItems, setOrderedItems] = useState<MenuItem[]>(MENU_ITEMS);
    const [previousOrder, setPreviousOrder] = useState<MenuItem[]>(MENU_ITEMS);
    const pathname = usePathname();
    const { userSettings, signOut, updateSettings } = useAuth();
    const { setShowHelp } = useKeyboardShortcuts();

    // Employee Context
    const { activeEmployee, logoutEmployee, loginWithPin, hasPermission, isLocked, lockScreen, unlockScreen, hasAdmin } = require('@/contexts/EmployeeContext').useEmployee();

    const appName = userSettings?.app_name || 'Cola Aí';

    // Hydration safety - only enable DnD after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Apply saved order from userSettings
    useEffect(() => {
        if (userSettings?.sidebar_order && userSettings.sidebar_order.length > 0) {
            const savedOrder = userSettings.sidebar_order;
            const reordered = savedOrder
                .map((href: string) => MENU_ITEMS.find(item => item.href === href))
                .filter((item): item is MenuItem => item !== undefined);

            // Add any new items that aren't in the saved order
            const missingItems = MENU_ITEMS.filter(
                item => !savedOrder.includes(item.href)
            );

            setOrderedItems([...reordered, ...missingItems]);
        }
    }, [userSettings?.sidebar_order]);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px threshold to start dragging
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // 250ms delay for touch
                tolerance: 5,
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

        // Always show Dashboard
        if (path === 'dashboard') return true;

        // If owner (no active employee), show everything
        if (!activeEmployee) return true;

        // Permission mapping
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
        setPreviousOrder([...orderedItems]);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            // Optimistic update - update UI immediately
            const oldIndex = orderedItems.findIndex(item => item.href === active.id);
            const newIndex = orderedItems.findIndex(item => item.href === over.id);

            const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
            setOrderedItems(newOrder);

            // Save to Supabase
            try {
                const newOrderHrefs = newOrder.map(item => item.href);
                const { error } = await updateSettings({ sidebar_order: newOrderHrefs });

                if (error) {
                    console.error('Error saving sidebar order:', error);
                    // Rollback on error
                    setOrderedItems(previousOrder);
                }
            } catch (error) {
                console.error('Error saving sidebar order:', error);
                // Rollback on error
                setOrderedItems(previousOrder);
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
                className={styles.mobileMenuBtn}
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                <FiMenu />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`
                ${styles.sidebar}
                ${collapsed ? styles.collapsed : ''}
                ${mobileOpen ? styles.mobileOpen : ''}
            `}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/dashboard" className={styles.brand}>
                        {userSettings?.logo_url ? (
                            <img
                                src={userSettings.logo_url}
                                alt={appName}
                                className={styles.logo}
                            />
                        ) : (
                            <span className={styles.logoEmoji}>🌭</span>
                        )}
                        {!collapsed && (
                            <div className={styles.brandInfo}>
                                <span className={styles.brandName}>{appName}</span>
                                {activeEmployee && (
                                    <span className={styles.employeeBadge}>
                                        {activeEmployee.name}
                                    </span>
                                )}
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation with Drag and Drop */}
                <nav className={styles.nav}>
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
                        // SSR fallback - render without drag and drop
                        filteredMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <Icon className={styles.navIcon} />
                                    {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                                    {isActive && <div className={styles.activeIndicator} />}
                                </Link>
                            );
                        })
                    )}
                </nav>

                {/* Footer */}
                <div className={styles.footer}>
                    {((!activeEmployee && !hasPermission('settings')) === false) && hasPermission('settings') && (
                        <Link
                            href="/configuracoes"
                            className={`${styles.navItem} ${pathname === '/configuracoes' ? styles.active : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <FiSettings className={styles.navIcon} />
                            {!collapsed && <span className={styles.navLabel}>Configurações</span>}
                        </Link>
                    )}

                    {activeEmployee ? (
                        <div className={styles.employeeControls}>
                            <button className={styles.navItem} onClick={handleEmployeeLogout} title="Sair do Funcionário">
                                <FiLogOut className={styles.navIcon} />
                                {!collapsed && <span className={styles.navLabel}>
                                    Sair ({activeEmployee.name.split(' ')[0]})
                                </span>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button className={styles.navItem} onClick={handleLockScreen} title="Bloquear Tela">
                                <FiUsers className={styles.navIcon} />
                                {!collapsed && <span className={styles.navLabel}>Bloquear Tela</span>}
                            </button>
                            <button className={styles.navItem} onClick={signOut} title="Sair do Sistema">
                                <FiLogOut className={styles.navIcon} />
                                {!collapsed && <span className={styles.navLabel}>Sair</span>}
                            </button>
                        </>
                    )}

                    <button
                        className={`${styles.navItem} ${styles.shortcutsBtn}`}
                        onClick={() => setShowHelp(true)}
                        title="Atalhos de Teclado (Ctrl + /)"
                    >
                        <FiCommand className={styles.navIcon} />
                        {!collapsed && (
                            <span className={styles.navLabel}>
                                Atalhos
                                <kbd className={styles.kbd}>Ctrl+/</kbd>
                            </span>
                        )}
                    </button>
                </div>

                {/* Collapse Toggle */}
                <button
                    className={styles.collapseBtn}
                    onClick={() => setCollapsed(!collapsed)}
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
