-- Migration: Add scheduled_emails table for delayed automation emails
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  automation_id BIGINT REFERENCES automations(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  from_name TEXT DEFAULT 'Acodera CRM',
  subject TEXT NOT NULL,
  body TEXT,
  attachments JSONB,
  status TEXT DEFAULT 'pending',
  send_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON scheduled_emails FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_send_at ON scheduled_emails(status, send_at);