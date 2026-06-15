-- Migration: Enable pg_cron and pg_net, schedule process-automations every minute
-- Run this in Supabase SQL Editor
--
-- Uses hardcoded service_role_key — replace with your project's key

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule old job if it exists (ignore error if it doesn't)
DO $$ BEGIN PERFORM cron.unschedule('process-automations'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Schedule the cron job: calls the Edge Function every minute.
-- The secret MUST be sent in a custom header — Supabase's gateway strips the
-- reserved 'apikey' header before it reaches the function (causes 401).
SELECT cron.schedule(
  'process-automations',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/process-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-automation-secret', 'b05d0ae8c2e63e145a706c026dd6149f20353d6986a83cd40d4637a7fd1f99f2'
    ),
    body := '{}'::jsonb
  );
  $$
);
