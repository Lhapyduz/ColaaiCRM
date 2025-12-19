'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    FiCreditCard
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import PinPadModal from '@/components/auth/PinPadModal';
import styles from './Sidebar.module.css';

const menuItems = [
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

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showPinPad, setShowPinPad] = useState(false);
    const pathname = usePathname();
    const { userSettings, signOut } = useAuth();
    const { setShowHelp } = useKeyboardShortcuts();

    // Employee Context
    // We import dynamically or use optional chaining if context might be missing during dev
    // But since we added it to layout, it should be fine.
    const { activeEmployee, logoutEmployee, loginWithPin, hasPermission, isLocked, lockScreen } = require('@/contexts/EmployeeContext').useEmployee();

    const appName = userSettings?.app_name || 'Cola Aí';

    const handleEmployeeLogout = () => {
        logoutEmployee(); // Now sets isLocked = true
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

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        // Map menu paths to permission keys
        // If no mapping defined, assume public or handle specifically
        // Simple mapping based on path
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
            'cozinha': 'orders', // Kitchen needs orders permission usually
            'entregas': 'orders', // Delivery is subset of orders usually
            'estoque': 'products',
            'cupons': 'settings', // Or specific coupons permission
            'fidelidade': 'customers',
            'caixa': 'finance', // Or specific
            'contas': 'finance',
            'fluxo-caixa': 'finance',
            'funcionarios': 'employees',
            'relatorios': 'reports',
            'historico': 'reports',
            'configuracoes': 'settings' // Handled in footer, but good to map
        };

        const requiredPerm = permissionMap[path];
        if (!requiredPerm) return true; // Default allow if unknown

        return hasPermission(requiredPerm);
    });

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

            {/* Pin Pad Modal */}
            {/* We import PinPadModal dynamically to avoid SSR issues if any, but standard import is fine */}
            {/* Assuming PinPadModal is imported above, let's add the import */}
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

                {/* Navigation */}
                <nav className={styles.nav}>
                    {filteredMenuItems.map((item) => {
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
                    })}
                </nav>

                {/* Footer */}
                <div className={styles.footer}>
                    {((!activeEmployee && !hasPermission('settings')) === false) && hasPermission('settings') && (
                        /* Logic simplified: Show settings if Owner OR Employee has permission */
                        /* Re-simplifying: if ((!activeEmployee) || (activeEmployee && hasPermission('settings'))) */
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
            />
        </>
    );
}
