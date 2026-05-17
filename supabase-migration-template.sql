-- Run this in Supabase SQL Editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS invoice_template JSONB DEFAULT '{}';
