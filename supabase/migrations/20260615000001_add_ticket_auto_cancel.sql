-- Auto-cancel window for unpaid invoices is now configured per ticket
-- (previously hardcoded/entered per invoice). Stored in minutes; default 24h.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS auto_cancel_minutes INTEGER NOT NULL DEFAULT 1440;
