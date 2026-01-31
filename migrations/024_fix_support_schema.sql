-- Create a secure view for user emails (to allow admin to see emails)
-- This is required for the join: tenant_auth:user_emails!tenant_id(email)
CREATE OR REPLACE VIEW user_emails AS
SELECT id, email, created_at
FROM auth.users;

-- Grant access to the view (adjust as necessary for your security model)
GRANT SELECT ON user_emails TO service_role;
GRANT SELECT ON user_emails TO authenticated; -- Be careful with this, maybe restrict? 
-- For now, authenticated users (admins) need to see it. Row security on calling side protects it.

-- Ensure support_tickets table exists
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Will contain the user_id
    subject TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Key constraints to allow the joins to work
    -- We reference auth.users generally
    CONSTRAINT fk_support_user FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Ensure ticket_messages table exists
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL, -- Can be tenant or admin
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'tenant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Support Tickets Policies
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- Note: Admin access via service_role bypasses RLS, so we don't strictly need admin policies if using service_role client.

-- Ticket Messages Policies
CREATE POLICY "Users can view messages of their tickets" ON ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their tickets" ON ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.tenant_id = auth.uid()
        )
    );

-- CRITICAL: Create the explicit Foreign Key relationships for PostgREST joins
-- The error "Could not find relationship" often happens because PostgREST 
-- needs a clear foreign key on the table to join with.

-- Relationship to user_settings
-- We need support_tickets.tenant_id -> user_settings.user_id
-- Since user_settings.user_id is UNIQUE, we can reference it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_support_tickets_user_settings'
    ) THEN
        ALTER TABLE support_tickets 
        ADD CONSTRAINT fk_support_tickets_user_settings 
        FOREIGN KEY (tenant_id) 
        REFERENCES user_settings(user_id);
    END IF;
END $$;

-- Relationship to user_emails view?
-- Views don't strictly have PKs/FKs in Postgres the same way, but PostgREST can infer if the view is simple.
-- However, for `user_emails!tenant_id`, PostgREST creates a relationship if the underlying column matches.
-- If `user_emails.id` is the join key.
-- Since `user_emails` is a view on `auth.users`, and `support_tickets.tenant_id` refs `auth.users`, 
-- PostgREST often detects it IF `user_emails` definition is simple.
-- If not, we might need a comment on the view (PostgREST smart comments) 
-- or ensure the column names match perfectly.
