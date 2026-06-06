-- Migration: Enable pg_cron and pg_net, schedule process-automations every minute
-- Run this in Supabase SQL Editor
--
-- Uses hardcoded service_role_key — replace with your project's key

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule old job if it exists
SELECT cron.unschedule('process-automations');

-- Schedule the cron job: calls the Edge Function every minute using the service role key
SELECT cron.schedule(
  'process-automations',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/process-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHhscHJndGZ1aG50cGNkaHNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0OTM1NSwiZXhwIjoyMDkzOTI1MzU1fQ.4CXw_d9a0XZgtRUnpiyua2OIiFhSxxeaMsP2h10Nxkk'
    ),
    body := '{}'::jsonb
  );
  $$
);
