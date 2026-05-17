-- Run this in Supabase SQL Editor (first time only, IF column doesn't exist)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing pending invoices with expiry 24h from purchase
UPDATE transactions SET expires_at = purchased_at + INTERVAL '24 hours'
WHERE status = 'pending' AND expires_at IS NULL AND purchased_at IS NOT NULL;
