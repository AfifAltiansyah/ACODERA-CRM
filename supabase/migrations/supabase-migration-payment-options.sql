-- Migration: Create per-tenant payment_options table
-- Each branch/user can configure their own bank accounts, e-wallets, and QR codes

CREATE TABLE IF NOT EXISTS payment_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'e_wallet', 'qr_code')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  account_number TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_options_branch ON payment_options (branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_options_branch_value ON payment_options (branch_id, type, value);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_payment_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_options_updated_at ON payment_options;
CREATE TRIGGER trg_payment_options_updated_at
  BEFORE UPDATE ON payment_options
  FOR EACH ROW EXECUTE FUNCTION update_payment_options_updated_at();

-- Row-level security: owners can manage their own branch's options
-- Uses JWT claims pattern (auth.jwt()->>'branch') matching existing RLS in supabase-migration-rls-secure.sql
ALTER TABLE payment_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own branch payment_options"
  ON payment_options FOR SELECT
  USING (
    auth.jwt()->>'role' = 'owner'
    OR branch_id = auth.jwt()->>'branch_id'
  );

CREATE POLICY "Users can insert own branch payment_options"
  ON payment_options FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'owner'
    OR branch_id = auth.jwt()->>'branch_id'
  );

CREATE POLICY "Users can update own branch payment_options"
  ON payment_options FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'owner'
    OR branch_id = auth.jwt()->>'branch_id'
  );

CREATE POLICY "Users can delete own branch payment_options"
  ON payment_options FOR DELETE
  USING (
    auth.jwt()->>'role' = 'owner'
    OR branch_id = auth.jwt()->>'branch_id'
  );

-- Seed default payment options for any branch without existing data
-- Run this separately for each branch that needs defaults:
-- INSERT INTO payment_options (branch_id, type, value, label, account_number)
--   SELECT 'BRANCH_ID_HERE', type, value, label, account_number
--   FROM (VALUES
--     ('bank'::text, 'bca', 'BCA', '81934138145'),
--     ('bank', 'bri', 'BRI', '0819341381450'),
--     ('bank', 'bni', 'BNI', '0819341381451')
--   ) AS defaults(type, value, label, account_number)
-- WHERE NOT EXISTS (
--   SELECT 1 FROM payment_options WHERE branch_id = 'BRANCH_ID_HERE'
-- );
