-- Migration: Multi-tenant access control
-- Run after init.sql

USE acodera_crm;

-- Add branch column to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT NULL AFTER role;

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  name VARCHAR(100) DEFAULT '',
  status ENUM('active','revoked') DEFAULT 'active',
  rate_limit INT DEFAULT 100,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hash (key_hash),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  api_key_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Update existing admin user role
UPDATE users SET role = 'owner', name = 'Acodera Admin' WHERE email = 'acoderaAdmin@gmail.com';

-- Seed partner accounts
INSERT IGNORE INTO users (email, password, name, role, branch) VALUES
('sicapung01@gmail.com', '$2a$10$w4e0KbuXh4NlKSNtf7YEV.STKbZRAXLIEa42JgKfiY7T4PzjBto9y', 'Sicapung Branch', 'partner', 'Sicapung'),
('altiansyah24@gmail.com', '$2a$10$Kx/FJhoj/rAtx1aCc20gUeOg9.4za5olwRHaGGqZJDdG/.p4Gfydi', 'Altiansyah Branch', 'partner', 'Altiansyah');

-- Assign branches to existing seed data for Partners
UPDATE IGNORE contacts SET branch = 'Sicapung' WHERE email IN ('sarah@techcorp.com', 'm.chen@innovate.io', 'emily.r@startup.co', 'dkim@globalent.com');
UPDATE IGNORE contacts SET branch = 'Altiansyah' WHERE email IN ('lisa.t@mediagroup.com', 'jwilson@retailplus.com', 'anna.m@designhub.io', 'rtaylor@financepro.com');
UPDATE IGNORE contacts SET branch = 'Sicapung' WHERE email IN ('sophie.b@edutech.org', 'chris.a@logistics.net', 'maria.g@healthcare.com', 'tom.h@realestate.co') AND branch IS NULL;
