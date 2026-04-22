-- Migration: Add bidirectional sync support to subscriptions table
-- Run this in Supabase SQL Editor

-- =============================================
-- PART 1: Add sync tracking columns
-- =============================================

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'app';

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.sync_source IS 'Source of last update: stripe (from webhook), app (from frontend), manual. Used to prevent infinite sync loops.';

-- =============================================
-- PART 2: Clean up duplicates (run once)
-- =============================================

-- First, check if there are duplicates
-- SELECT user_id, COUNT(*) FROM subscriptions GROUP BY user_id HAVING COUNT(*) > 1;

-- If duplicates exist, keep only the most recent
DELETE FROM subscriptions 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM subscriptions 
    ORDER BY user_id, updated_at DESC NULLS LAST
);

-- =============================================
-- PART 3: Ensure unique constraint
-- =============================================

-- Drop existing constraint if it exists (safe to run)
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

-- Add unique constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- =============================================
-- PART 4: Update timestamp trigger
-- =============================================

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- NOTES FOR SUPABASE → STRIPE SYNC
-- =============================================
-- 
-- Option 1: Database Webhooks (Recommended for simplicity)
-- Go to Supabase Dashboard > Database > Webhooks
-- Create a new webhook:
--   - Table: subscriptions
--   - Events: UPDATE
--   - URL: https://your-app.vercel.app/api/stripe/reverse-sync
--   - Headers: Add a secret header for verification
--
-- Option 2: Edge Function with pg_net (More complex)
-- Requires enabling pg_net extension and additional setup
--
-- For now, the app handles sync via the /api/stripe/sync endpoint
-- which is called after returning from Stripe checkout.
