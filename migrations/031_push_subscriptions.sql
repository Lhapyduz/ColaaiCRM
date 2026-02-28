-- Push Subscriptions Table for Web Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid () = user_id);

-- Service role can manage all subscriptions (for sending notifications from backend)
CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions FOR ALL USING (auth.role () = 'service_role');

-- Index for faster lookup by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);