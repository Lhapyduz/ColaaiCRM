import { createClient } from '@supabase/supabase-js';

// Note: This client requires SUPABASE_SERVICE_ROLE_KEY to be set in .env.local
// It bypasses Row Level Security, so use it only on the server and with care.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);
