-- Migration: Add Action Logs table
-- This migration creates a table to track user actions for auditing

-- Action logs table
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own action logs"
    ON action_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action logs"
    ON action_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_entity ON action_logs(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action_type ON action_logs(user_id, action_type);

-- Comments
COMMENT ON TABLE action_logs IS 'Stores audit trail of user actions';
COMMENT ON COLUMN action_logs.action_type IS 'Type of action: create, update, delete, login, logout, etc.';
COMMENT ON COLUMN action_logs.entity_type IS 'Type of entity affected: order, product, customer, etc.';
COMMENT ON COLUMN action_logs.metadata IS 'Additional JSON data about the action';
