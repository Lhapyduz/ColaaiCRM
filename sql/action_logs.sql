-- Action Logs Table
-- Run this SQL in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own logs" ON action_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON action_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs" ON action_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_logs_user_date ON action_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_type ON action_logs(action_type, entity_type);

-- Function to cleanup old logs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_action_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM action_logs 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup all logs for a user
CREATE OR REPLACE FUNCTION cleanup_all_action_logs(target_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM action_logs 
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
