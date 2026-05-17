-- Migration: Enable pg_cron and pg_net, schedule process-scheduled-emails every minute
-- Run this in Supabase SQL Editor
--
-- NOTE: You can delete your cron-job.org job — this uses Supabase's built-in scheduler

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the cron job: calls the Edge Function every minute using the service role key
-- Replace YOUR_SERVICE_ROLE_KEY below with your actual service role key from:
--   https://supabase.com/dashboard/project/rthxlprgtfuhntpcdhsh/settings/api
-- The key starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SELECT cron.schedule(
  'process-scheduled-emails',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);