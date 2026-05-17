-- Migration: Add recurring schedule columns to automations table
-- Run this in Supabase SQL Editor

-- Add schedule columns
ALTER TABLE automations ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'once';
-- 'once' = send one time, 'recurring' = repeat on schedule
ALTER TABLE automations ADD COLUMN IF NOT EXISTS schedule_frequency TEXT DEFAULT 'monthly';
-- 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
ALTER TABLE automations ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
-- When to first run (or next run if recurring)
ALTER TABLE automations ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
-- Auto-calculated: next time this automation should fire
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
-- Last time it was executed