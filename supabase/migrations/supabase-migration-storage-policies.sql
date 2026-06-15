-- Migration: Storage policies for proofs bucket (public read, service insert)
-- Run this in Supabase SQL Editor after creating the 'proofs' storage bucket

CREATE POLICY "public_read_proofs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'proofs');

-- SECURITY FIX: previously this policy had no role restriction (TO clause),
-- so the anon/authenticated roles could upload arbitrary files to the 'proofs'
-- bucket (storage abuse / hosting attacker-controlled content). Uploads only
-- ever happen server-side via the Edge Function (routes.ts) using the
-- service_role key, so restricting INSERT to service_role is safe.
-- For existing deployments, drop the old policy first:
--   DROP POLICY IF EXISTS "service_insert_proofs" ON storage.objects;
CREATE POLICY "service_insert_proofs" ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'proofs');
