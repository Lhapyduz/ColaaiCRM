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
    FiMenu
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

const menuItems = [
    { href: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/produtos', icon: FiShoppingBag, label: 'Produtos' },
    { href: '/categorias', icon: FiGrid, label: 'Categorias' },
    { href: '/pedidos', icon: FiClipboard, label: 'Pedidos' },
    { href: '/cozinha', icon: GiCookingPot, label: 'Cozinha' },
    { href: '/entregas', icon: FiTruck, label: 'Entregas' },
    { href: '/caixa', icon: FiDollarSign, label: 'Caixa' },
    { href: '/relatorios', icon: FiBarChart2, label: 'Relatórios' },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { userSettings, signOut } = useAuth();

    const appName = userSettings?.app_name || 'Cola Aí';

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
                        {!collapsed && <span className={styles.brandName}>{appName}</span>}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className={styles.nav}>
                    {menuItems.map((item) => {
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
                    <Link
                        href="/configuracoes"
                        className={`${styles.navItem} ${pathname === '/configuracoes' ? styles.active : ''}`}
                        onClick={() => setMobileOpen(false)}
                    >
                        <FiSettings className={styles.navIcon} />
                        {!collapsed && <span className={styles.navLabel}>Configurações</span>}
                    </Link>

                    <button className={styles.navItem} onClick={signOut}>
                        <FiLogOut className={styles.navIcon} />
                        {!collapsed && <span className={styles.navLabel}>Sair</span>}
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
        </>
    );
}
