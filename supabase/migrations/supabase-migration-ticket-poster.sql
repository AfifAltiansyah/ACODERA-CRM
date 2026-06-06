-- Migration: Add image_url column to tickets for poster upload
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS image_url TEXT;
