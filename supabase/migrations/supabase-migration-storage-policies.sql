-- Migration: Storage policies for proofs bucket (public read, service insert)
-- Run this in Supabase SQL Editor after creating the 'proofs' storage bucket

CREATE POLICY "public_read_proofs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'proofs');

CREATE POLICY "service_insert_proofs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'proofs');
