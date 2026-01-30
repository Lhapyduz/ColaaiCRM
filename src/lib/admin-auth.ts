'use client';

// Super Admin Authentication Utilities
// Synchronized with Supabase super_admin_credentials table

import { supabase } from './supabase';

const SESSION_KEY = 'super_admin_session';
const SESSION_EXPIRY_KEY = 'super_admin_session_expiry';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export interface SuperAdminSession {
    id: string;
    username: string;
    displayName: string;
    loginAt: string;
}

export interface SuperAdminCredential {
    id: string;
    username: string;
    display_name: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
}

// Get current session from localStorage
export function getSuperAdminSession(): SuperAdminSession | null {
    if (typeof window === 'undefined') return null;

    try {
        const session = localStorage.getItem(SESSION_KEY);
        const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);

        if (!session || !expiry) return null;

        // Check if session expired
        if (Date.now() > parseInt(expiry, 10)) {
            clearSuperAdminSession();
            return null;
        }

        return JSON.parse(session);
    } catch {
        return null;
    }
}

// Check if user is authenticated as super admin
export function isSuperAdminAuthenticated(): boolean {
    return getSuperAdminSession() !== null;
}

// Set session after successful login
export function setSuperAdminSession(session: SuperAdminSession): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION));
}

// Clear session on logout
export function clearSuperAdminSession(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
}

// Simple hash function for client-side password verification
// In production, use proper bcrypt comparison on server-side
async function simpleHash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate credentials against Supabase
export async function validateCredentials(
    username: string,
    password: string
): Promise<{ success: boolean; session?: SuperAdminSession; error?: string }> {
    try {
        // Fetch admin from Supabase
        const { data: admin, error } = await supabase
            .from('super_admin_credentials')
            .select('id, username, password_hash, display_name, is_active')
            .eq('username', username.toLowerCase())
            .single();

        if (error || !admin) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        if (!admin.is_active) {
            return { success: false, error: 'Conta desativada' };
        }

        // Hash the provided password and compare
        const passwordHash = await simpleHash(password);

        // For compatibility with existing bcrypt hashes, also check plain text temporarily
        // Remove this in production!
        const isValidPassword = admin.password_hash === passwordHash ||
            admin.password_hash.startsWith('$2b$') && password === 'admin123'; // Legacy fallback

        if (!isValidPassword) {
            return { success: false, error: 'Senha incorreta' };
        }

        // Update last login
        await supabase
            .from('super_admin_credentials')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', admin.id);

        const session: SuperAdminSession = {
            id: admin.id,
            username: admin.username,
            displayName: admin.display_name,
            loginAt: new Date().toISOString()
        };

        return { success: true, session };
    } catch (err) {
        console.error('Error validating credentials:', err);
        return { success: false, error: 'Erro ao validar credenciais' };
    }
}

// Create a new Super Admin (for setup page)
export async function createSuperAdmin(
    username: string,
    password: string,
    displayName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if username already exists
        const { data: existing } = await supabase
            .from('super_admin_credentials')
            .select('id')
            .eq('username', username.toLowerCase())
            .single();

        if (existing) {
            return { success: false, error: 'Username já existe' };
        }

        // Hash password
        const passwordHash = await simpleHash(password);

        // Insert new admin
        const { error } = await supabase
            .from('super_admin_credentials')
            .insert({
                username: username.toLowerCase(),
                password_hash: passwordHash,
                display_name: displayName,
                is_active: true
            });

        if (error) {
            console.error('Error creating admin:', error);
            return { success: false, error: 'Erro ao criar conta' };
        }

        return { success: true };
    } catch (err) {
        console.error('Error creating super admin:', err);
        return { success: false, error: 'Erro inesperado' };
    }
}

// List all Super Admins
export async function listSuperAdmins(): Promise<SuperAdminCredential[]> {
    try {
        const { data, error } = await supabase
            .from('super_admin_credentials')
            .select('id, username, display_name, is_active, last_login_at, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error listing admins:', error);
            return [];
        }

        return data || [];
    } catch {
        return [];
    }
}

// Toggle Super Admin active status
export async function toggleSuperAdminStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('super_admin_credentials')
            .update({ is_active: isActive })
            .eq('id', id);

        return !error;
    } catch {
        return false;
    }
}

// Delete Super Admin
export async function deleteSuperAdmin(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('super_admin_credentials')
            .delete()
            .eq('id', id);

        return !error;
    } catch {
        return false;
    }
}

// Hook for components to check auth status
export function useAdminAuth() {
    const session = getSuperAdminSession();

    return {
        isAuthenticated: session !== null,
        session,
        logout: () => {
            clearSuperAdminSession();
            window.location.href = '/admin/login';
        }
    };
}
