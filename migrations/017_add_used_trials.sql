-- Cola Aí - Used Trials Tracking
-- Migration 017: Track which trial plans each user has already used
-- This prevents users from reusing the same trial when switching plans

-- Create table to track used trials per user per plan
CREATE TABLE IF NOT EXISTS used_trials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stripe_subscription_id TEXT,
    UNIQUE(user_id, plan_type)
);

-- Enable RLS
ALTER TABLE used_trials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow service role full access for webhook operations
-- Users can only read their own trials
CREATE POLICY "Users can view own used trials" ON used_trials
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role (webhook) can insert used trials
CREATE POLICY "Service role can insert used trials" ON used_trials
    FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_used_trials_user ON used_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_used_trials_user_plan ON used_trials(user_id, plan_type);
