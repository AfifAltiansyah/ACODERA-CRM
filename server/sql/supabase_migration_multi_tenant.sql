-- Supabase PostgreSQL Migration: Multi-tenant access control
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- 1. Add branch column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;

-- 2. Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  rate_limit INT DEFAULT 100,
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  api_key_id BIGINT REFERENCES api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT NULL,
  entity_id TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 4. Enable RLS on new tables (optional — service_role key bypasses these)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Update existing admin user role
UPDATE users SET role = 'owner' WHERE email = 'acoderaAdmin@gmail.com' AND (role IS NULL OR role != 'owner');

-- 6. Seed partner accounts (passwords are bcrypt hashed)
--    sicapung01 / makanSini
--    altiansyah24 / jajanSini
INSERT INTO users (email, password, name, role, branch)
SELECT 'sicapung01@gmail.com', '$2a$10$w4e0KbuXh4NlKSNtf7YEV.STKbZRAXLIEa42JgKfiY7T4PzjBto9y', 'Sicapung Branch', 'partner', 'Sicapung'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sicapung01@gmail.com');

INSERT INTO users (email, password, name, role, branch)
SELECT 'altiansyah24@gmail.com', '$2a$10$Kx/FJhoj/rAtx1aCc20gUeOg9.4za5olwRHaGGqZJDdG/.p4Gfydi', 'Altiansyah Branch', 'partner', 'Altiansyah'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'altiansyah24@gmail.com');

-- 7. (Optional) Add branch column to data tables for future frontend filtering
-- Uncomment these when you're ready to add tenant isolation to the main data:
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
-- ALTER TABLE automations ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
-- ALTER TABLE flows ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
