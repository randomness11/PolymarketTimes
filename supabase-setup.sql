-- ============================================
-- SUPABASE SETUP FOR POLYTIMES
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the market history table
CREATE TABLE IF NOT EXISTS market_history (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  last_shown TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_odds DECIMAL NOT NULL,
  show_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index for querying by last_shown (used for hourly cleanup)
CREATE INDEX IF NOT EXISTS idx_market_history_last_shown 
ON market_history(last_shown);

-- 3. Enable Row Level Security
ALTER TABLE market_history ENABLE ROW LEVEL SECURITY;

-- 4. Allow all operations for the service role
CREATE POLICY "Allow all operations" ON market_history
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- OPTIONAL: Automatic hourly cleanup via pg_cron
-- (Requires pg_cron extension enabled in Supabase)
-- ============================================

-- Enable pg_cron extension (run this first, then the rest)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly cleanup at the start of each hour
-- SELECT cron.schedule(
--   'cleanup-old-market-history',
--   '0 * * * *',  -- Every hour at minute 0
--   $$DELETE FROM market_history WHERE last_shown < NOW() - INTERVAL '1 hour'$$
-- );

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove a scheduled job:
-- SELECT cron.unschedule('cleanup-old-market-history');


-- 5. Create subscribers table for the newsletter
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable RLS on subscribers
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- 7. RESET POLICIES (Drop first to avoid "already exists" error)
DROP POLICY IF EXISTS "Allow public insert" ON subscribers;
DROP POLICY IF EXISTS "Allow service read" ON subscribers;

-- 8. Create Policies
CREATE POLICY "Allow public insert" ON subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service read" ON subscribers
  FOR SELECT USING (auth.role() = 'service_role');

-- 9. GRANT PERMISSIONS (Critical for Anon Key usage)
GRANT INSERT ON subscribers TO anon;
GRANT INSERT ON subscribers TO authenticated;
GRANT INSERT ON subscribers TO service_role;

-- 10. RPC Function (Bulletproof bypassing of RLS)
-- usage: await supabase.rpc('subscribe_email', { email_arg: '...' })
CREATE OR REPLACE FUNCTION subscribe_email(email_arg TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as database owner (bypasses RLS)
SET search_path = public -- Secure the search path
AS $$
BEGIN
  INSERT INTO subscribers (email)
  VALUES (email_arg)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION subscribe_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION subscribe_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_email(TEXT) TO service_role;

