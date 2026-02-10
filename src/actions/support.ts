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
    console.log('[ensureAdmin] Starting admin check...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error('[ensureAdmin] Auth error:', authError);
    }

    if (!user) {
        console.error('[ensureAdmin] No user session found. This usually happens on Vercel if cookies are not being sent or user is not logged in via Supabase Auth.');
        throw new Error('Unauthorized');
    }

    console.log(`[ensureAdmin] User ${user.id} (${user.email}) found. Checking admin_users table...`);

    const { data: adminRecord, error: dbError } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (dbError || !adminRecord) {
        console.warn(`[ensureAdmin] Access denied for user ${user.id} (${user.email}). Not found in admin_users table. Error:`, dbError);
        throw new Error('Forbidden');
    }

    console.log('[ensureAdmin] Access granted.');
    return user;
}

// Admin Actions (Using Service Role Client or Super Admin logic)

export async function adminGetTickets() {
    console.log('[adminGetTickets] Initiating ticket fetch...');
    try {
        await ensureAdmin();

        // Admin uses service role to bypass RLS
        // Join user_settings via FK (tenant_id -> user_settings.user_id)
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                tenant_settings:user_settings(app_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[adminGetTickets] Supabase Query Error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data) return [];

        console.log(`[adminGetTickets] Found ${data.length} tickets. Fetching tenant emails...`);

        // Fetch emails for all unique tenant_ids via auth admin API
        const uniqueTenantIds = [...new Set(data.map((t: any) => t.tenant_id))];
        const emailMap: Record<string, string> = {};

        await Promise.all(
            uniqueTenantIds.map(async (tenantId: string) => {
                try {
                    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(tenantId);
                    if (userError) {
                        console.error(`[adminGetTickets] Error fetching user ${tenantId}:`, userError);
                    }
                    if (userData?.user?.email) {
                        emailMap[tenantId] = userData.user.email;
                    }
                } catch (err) {
                    console.error(`[adminGetTickets] Unexpected error fetching user ${tenantId}:`, err);
                }
            })
        );

        // Transform to include store name and email
        return data.map((ticket: any) => ({
            ...ticket,
            store_name: ticket.tenant_settings?.app_name || 'Desconhecido',
            tenant_email: emailMap[ticket.tenant_id] || 'Email não disponível'
        }));
    } catch (err) {
        console.error('[adminGetTickets] Global catch:', err);
        throw err;
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
