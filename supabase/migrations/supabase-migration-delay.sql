-- Migration: Add delay_value and delay_unit to automations table
-- Run this in Supabase SQL Editor

ALTER TABLE automations ADD COLUMN IF NOT EXISTS delay_value INTEGER DEFAULT 0;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS delay_unit TEXT DEFAULT 'minutes';