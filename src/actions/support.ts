'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export interface TicketData {
    subject: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
}

// Tenant Actions

export async function createTicket(data: TicketData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
            tenant_id: user.id,
            subject: data.subject,
            priority: data.priority,
            category: data.category
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/configuracoes');
    return ticket;
}

export async function sendMessage(ticketId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Verify ownership or check constraints will handle it via RLS, 
    // but explicit check is good for validation error messages
    const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('tenant_id', user.id)
        .single();

    if (!ticket) throw new Error('Ticket not found or unauthorized');

    const { error } = await supabase
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            sender_role: 'tenant',
            content
        });

    if (error) throw error;
    revalidatePath('/configuracoes');
}

export async function getTenantTickets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('support_tickets')
        .select(`
            *,
            messages:ticket_messages(count)
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getTicketMessages(ticketId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    // Note: RLS ensures users only see messages for their tickets

    if (error) throw error;
    return data;
}

// Helper to ensure user is admin and return their ID
async function ensureAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[ensureAdmin] No user session found');
        throw new Error('Unauthorized');
    }

    const { data: adminRecord, error } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !adminRecord) {
        console.warn(`[ensureAdmin] Access denied for user ${user.id} (${user.email}). Not found in admin_users table.`);
        throw new Error('Forbidden');
    }

    return user;
}

// Admin Actions (Using Service Role Client or Super Admin logic)

export async function adminGetTickets() {
    await ensureAdmin();

    try {
        // Admin uses service role to bypass RLS
        // We join user_settings directly via the tenant_id field mapping
        // We also join user_emails view to get the real email
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                tenant_settings:user_settings(app_name),
                tenant_auth:user_emails(email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[adminGetTickets] Supabase Error:', error);
            // If the join still fails, try fetching without joins as a fallback
            if (error.message.includes('relationship')) {
                const { data: simpleData, error: simpleError } = await supabaseAdmin
                    .from('support_tickets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (simpleError) throw simpleError;
                return simpleData;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data) return [];

        // Transform to include store name and email easier
        return data.map((ticket: any) => ({
            ...ticket,
            // Handle cases where joins might return null (e.g. user deleted)
            store_name: ticket.tenant_settings?.app_name || 'Desconhecido',
            tenant_email: ticket.tenant_auth?.email || 'Email não disponível'
        }));
    } catch (err) {
        console.error('[adminGetTickets] Unexpected Error:', err);
        // Return empty array instead of crashing layout, but log error
        throw err; // Let page handle it or rethrow as friendly error
    }
}

export async function adminGetTicketMessages(ticketId: string) {
    await ensureAdmin();

    try {
        const { data, error } = await supabaseAdmin
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('[adminGetTicketMessages] Error:', err);
        throw err;
    }
}

export async function adminSendMessage(ticketId: string, content: string) {
    const user = await ensureAdmin();

    try {
        const { error } = await supabaseAdmin
            .from('ticket_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: user.id, // Securely use the session ID, not a passed string
                sender_role: 'admin',
                content
            });

        if (error) throw error;

        // Auto-update status to in_progress if open
        await supabaseAdmin
            .from('support_tickets')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .eq('id', ticketId)
            .eq('status', 'open');

        revalidatePath('/admin/support');
    } catch (err) {
        console.error('[adminSendMessage] Error:', err);
        throw err;
    }
}

export async function adminUpdateTicketStatus(ticketId: string, status: string) {
    await ensureAdmin();

    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

    if (error) throw error;
    revalidatePath('/admin/support');
}

export async function adminDeleteTicket(ticketId: string) {
    await ensureAdmin();

    const { error } = await supabaseAdmin
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

    if (error) throw error;
    revalidatePath('/admin/support');
}

export async function adminUpdateTicketDetails(
    ticketId: string,
    data: { subject: string; priority: 'low' | 'medium' | 'high' | 'urgent'; category: string }
) {
    await ensureAdmin();

    const { error } = await supabaseAdmin
        .from('support_tickets')
        .update({
            subject: data.subject,
            priority: data.priority,
            category: data.category,
            updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

    if (error) throw error;
    revalidatePath('/admin/support');
}
