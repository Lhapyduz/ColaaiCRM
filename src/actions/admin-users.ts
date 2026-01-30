'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function listAllUsers() {
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error('Error listing users:', error);
            throw new Error(error.message);
        }

        return users || [];
    } catch (error) {
        console.error('Failed to list users:', error);
        return [];
    }
}
