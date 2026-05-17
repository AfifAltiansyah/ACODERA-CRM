-- Add invoice_template column to users table if it doesn't exist
-- This stores the user's invoice template settings (logo, colors, currency, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invoice_template JSONB DEFAULT '{}';

-- Add currency_symbol column to users table if it doesn't exist (fallback)
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT 'Rp';
