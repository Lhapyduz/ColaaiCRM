'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { clearSuperAdminSession, getSuperAdminSession } from '@/lib/admin-auth';
import {
    FiHome,
    FiUsers,
    FiDollarSign,
    FiMessageSquare,
    FiActivity,
    FiLogOut,
    FiShield,
    FiPackage
} from 'react-icons/fi';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <FiHome size={20} /> },
    { label: 'Clientes', href: '/admin/clients', icon: <FiUsers size={20} /> },
    { label: 'Planos', href: '/admin/plans', icon: <FiPackage size={20} /> },
    { label: 'Financeiro', href: '/admin/finance', icon: <FiDollarSign size={20} /> },
    { label: 'Suporte', href: '/admin/support', icon: <FiMessageSquare size={20} /> },
    { label: 'System Health', href: '/admin/health', icon: <FiActivity size={20} /> },
    { label: 'Super Admins', href: '/admin/super-admins', icon: <FiShield size={20} /> },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const session = getSuperAdminSession();

    const handleLogout = () => {
        clearSuperAdminSession();
        window.location.href = '/admin/login';
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <FiShield className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg">Super Admin</h1>
                        <p className="text-gray-500 text-xs">
                            {session?.displayName || 'Backoffice'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                "hover:bg-gray-800/50",
                                isActive
                                    ? "bg-linear-to-r from-orange-500/20 to-transparent text-orange-400 border-l-2 border-orange-500"
                                    : "text-gray-400 hover:text-white"
                            )}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-800 space-y-1">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                    <FiLogOut size={20} />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}
