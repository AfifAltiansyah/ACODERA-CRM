-- Migration: Add check-in tracking columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS checked_in_by TEXT;
