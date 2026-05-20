-- Migration: Enable pg_cron and pg_net, schedule process-automations every minute
-- Run this in Supabase SQL Editor
--
-- Uses current_setting('secrets.service_role_key') to avoid hardcoding the key
-- This reads from Supabase's built-in secret management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the cron job: calls the Edge Function every minute using the service role key
-- The key is resolved at runtime via current_setting, avoiding hardcoded secrets in migrations
SELECT cron.schedule(
  'process-automations',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/process-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('secrets.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Note: After deploying, remove the old cron job if it exists:
-- SELECT cron.unschedule('process-scheduled-emails');
