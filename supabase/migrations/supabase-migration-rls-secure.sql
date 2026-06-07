-- Secure RLS Policies Migration
-- Run this in Supabase SQL Editor to replace the open "Allow all access" policies
-- This enforces tenant/branch isolation and proper access control

-- ─── USERS TABLE ──────────────────────────────────────────────────────
-- Drop the open policy
DROP POLICY IF EXISTS "Allow all access" ON users;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id OR auth.jwt()->>'role' = 'owner');

-- Only owners can insert users
CREATE POLICY "Owners can create users" ON users
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'owner');

-- Only owners can update users
CREATE POLICY "Owners can update users" ON users
  FOR UPDATE USING (auth.jwt()->>'role' = 'owner');

-- Only owners can delete users
CREATE POLICY "Owners can delete users" ON users
  FOR DELETE USING (auth.jwt()->>'role' = 'owner');

-- Service role bypass (for Express backend using service_key)
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- ─── CONTACTS TABLE ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON contacts;

-- Users can view contacts from their branch (or all if owner)
CREATE POLICY "Branch-isolated contact read" ON contacts
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- Users can create contacts in their branch
CREATE POLICY "Branch-isolated contact create" ON contacts
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- Users can update contacts from their branch
CREATE POLICY "Branch-isolated contact update" ON contacts
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- Users can delete contacts from their branch
CREATE POLICY "Branch-isolated contact delete" ON contacts
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- ─── AUTOMATIONS TABLE ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON automations;

CREATE POLICY "Branch-isolated automation read" ON automations
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated automation create" ON automations
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated automation update" ON automations
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated automation delete" ON automations
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- ─── AUTOMATION_LOGS TABLE ──────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON automation_logs;

CREATE POLICY "Branch-isolated automation log read" ON automation_logs
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_logs.automation_id
      AND (a.branch = auth.jwt()->>'branch' OR a.branch IS NULL)
    )
  );

CREATE POLICY "Branch-isolated automation log create" ON automation_logs
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_logs.automation_id
      AND (a.branch = auth.jwt()->>'branch' OR a.branch IS NULL)
    )
  );

-- ─── SCHEDULED_EMAILS TABLE ─────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON scheduled_emails;

CREATE POLICY "Branch-isolated scheduled email read" ON scheduled_emails
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = scheduled_emails.automation_id
      AND (a.branch = auth.jwt()->>'branch' OR a.branch IS NULL)
    )
  );

CREATE POLICY "Branch-isolated scheduled email create" ON scheduled_emails
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = scheduled_emails.automation_id
      AND (a.branch = auth.jwt()->>'branch' OR a.branch IS NULL)
    )
  );

CREATE POLICY "Branch-isolated scheduled email update" ON scheduled_emails
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = scheduled_emails.automation_id
      AND (a.branch = auth.jwt()->>'branch' OR a.branch IS NULL)
    )
  );

-- ─── FLOWS TABLE ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON flows;

CREATE POLICY "Branch-isolated flow read" ON flows
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated flow create" ON flows
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated flow update" ON flows
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated flow delete" ON flows
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- ─── REVIEWS TABLE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON reviews;

-- Reviews are shared (no branch isolation), but only owners can modify
CREATE POLICY "Anyone can read reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Owners can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'owner');

CREATE POLICY "Owners can update reviews" ON reviews
  FOR UPDATE USING (auth.jwt()->>'role' = 'owner');

CREATE POLICY "Owners can delete reviews" ON reviews
  FOR DELETE USING (auth.jwt()->>'role' = 'owner');

-- ─── TICKETS TABLE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON tickets;

CREATE POLICY "Branch-isolated ticket read" ON tickets
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated ticket create" ON tickets
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated ticket update" ON tickets
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated ticket delete" ON tickets
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch'
    OR branch IS NULL
  );

-- ─── TRANSACTIONS TABLE ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON transactions;

CREATE POLICY "Branch-isolated transaction read" ON transactions
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch_id'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated transaction create" ON transactions
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch_id'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated transaction update" ON transactions
  FOR UPDATE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch_id'
    OR branch IS NULL
  );

CREATE POLICY "Branch-isolated transaction delete" ON transactions
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR branch = auth.jwt()->>'branch_id'
    OR branch IS NULL
  );

-- ─── API_KEYS TABLE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON api_keys;

CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR user_id = (auth.jwt()->>'id')::bigint
  );

CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (
    user_id = (auth.jwt()->>'id')::bigint
  );

CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (
    auth.jwt()->>'role' = 'owner'
    OR user_id = (auth.jwt()->>'id')::bigint
  );

-- ─── AUDIT_LOGS TABLE ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON audit_logs;

CREATE POLICY "Owners can view all audit logs" ON audit_logs
  FOR SELECT USING (auth.jwt()->>'role' = 'owner');

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── INVOICE_TEMPLATES TABLE ────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON invoice_templates;

CREATE POLICY "Branch-isolated template read" ON invoice_templates
  FOR SELECT USING (
    auth.jwt()->>'role' = 'owner'
    OR user_id = (auth.jwt()->>'id')::bigint
  );

CREATE POLICY "Users can manage own templates" ON invoice_templates
  FOR ALL USING (
    auth.jwt()->>'role' = 'owner'
    OR user_id = (auth.jwt()->>'id')::bigint
  );
