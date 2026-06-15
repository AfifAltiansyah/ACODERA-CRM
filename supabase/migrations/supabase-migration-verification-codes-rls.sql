-- SECURITY FIX: lock down the verification_codes table.
--
-- The table was created without Row Level Security. Because Supabase grants the
-- `anon` / `authenticated` roles default access to public-schema tables, any
-- client holding the (public) anon key could read every email-verification and
-- password-reset code via PostgREST — a trivial account-takeover vector.
--
-- Codes are only ever written/read by Edge Functions using the service_role key,
-- which bypasses RLS. So enabling RLS with NO policies (deny-all) and revoking
-- the role grants is safe and breaks nothing.
--
-- Run this in the Supabase SQL Editor on any existing deployment.

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes FORCE ROW LEVEL SECURITY;

-- Remove the default public-schema grants so no policy is even reachable by clients.
REVOKE ALL ON verification_codes FROM anon, authenticated;

-- Defensive cleanup: drop any permissive policy that may have been added.
DROP POLICY IF EXISTS "Allow all access" ON verification_codes;
