-- Run this ENTIRE script in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor/sql
-- Paste ALL of this and click RUN

-- Drop existing tables if they exist (clean start)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS ticket_instances CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS flows CASCADE;
DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  branch TEXT,
  branch_id TEXT,
  payment_gateway TEXT,
  gateway_config JSONB DEFAULT '{}',
  gateway_webhook_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Contacts table
CREATE TABLE contacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  profesi TEXT DEFAULT '',
  message TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Automations table
CREATE TABLE automations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  trigger_event TEXT,
  schedule TEXT,
  delay_value INTEGER DEFAULT 0,
  delay_unit TEXT DEFAULT 'minutes',
  schedule_type TEXT DEFAULT 'once',
  schedule_frequency TEXT DEFAULT 'monthly',
  scheduled_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  contacts_count INTEGER DEFAULT 0,
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  from_name TEXT DEFAULT 'Acodera CRM',
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Automation logs table
CREATE TABLE automation_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  automation_id BIGINT REFERENCES automations(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT
);
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Scheduled emails table (for delayed automation sending)
CREATE TABLE scheduled_emails (
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
CREATE INDEX idx_scheduled_emails_status_send_at ON scheduled_emails(status, send_at);

-- Flows table
CREATE TABLE flows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'new',
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

-- Reviews table
CREATE TABLE reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT,
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Tickets table (event/ticket type)
CREATE TABLE tickets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  abbreviation TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  location TEXT,
  date_time TIMESTAMPTZ,
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Transactions table (combines invoices + ticket instances)
CREATE TABLE transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL,
  barcode TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price_per_unit NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  buyer_name TEXT DEFAULT '',
  buyer_email TEXT DEFAULT '',
  buyer_phone TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  payment_detail TEXT DEFAULT '',
  status TEXT DEFAULT 'available',
  branch TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Untitled',
  status TEXT DEFAULT 'active',
  rate_limit INTEGER DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  api_key_id BIGINT REFERENCES api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies are defined in supabase-migration-rls-secure.sql
-- Run that file AFTER this schema to apply proper access controls.

-- Seed contacts
INSERT INTO contacts (name, email, phone, address, profesi, message) VALUES
('Sarah Johnson', 'sarah@techcorp.com', '+1 (555) 012-3456', '123 Oak Street, Portland, OR 97201', 'Software Engineer', 'Interested in enterprise plan'),
('Michael Chen', 'm.chen@innovate.io', '+1 (555) 234-5678', '456 Pine Ave, San Francisco, CA 94102', 'Product Manager', 'Requesting demo for team of 50'),
('Emily Rodriguez', 'emily.r@startup.co', '+1 (555) 345-6789', '789 Elm Blvd, Austin, TX 73301', 'Designer', 'Looking for CRM integration'),
('David Kim', 'dkim@globalent.com', '+1 (555) 456-7890', '321 Maple Dr, Seattle, WA 98101', 'CTO', 'Needs custom workflow setup'),
('Lisa Thompson', 'lisa.t@mediagroup.com', '+1 (555) 567-8901', '654 Cedar Ln, Denver, CO 80201', 'Marketing Director', 'Annual contract renewal'),
('James Wilson', 'jwilson@retailplus.com', '+1 (555) 678-9012', '987 Birch St, Chicago, IL 60601', 'Operations Manager', 'Multi-location deployment'),
('Anna Martinez', 'anna.m@designhub.io', '+1 (555) 789-0123', '147 Walnut Way, Miami, FL 33101', 'Creative Director', 'Creative team pipeline'),
('Robert Taylor', 'rtaylor@financepro.com', '+1 (555) 890-1234', '258 Spruce Ct, Boston, MA 02101', 'Financial Analyst', 'Compliance requirements discussion'),
('Sophie Brown', 'sophie.b@edutech.org', '+1 (555) 901-2345', '369 Ash Rd, Nashville, TN 37201', 'Education Consultant', 'Education sector pricing inquiry'),
('Chris Anderson', 'chris.a@logistics.net', '+1 (555) 012-9876', '741 Poplar Pl, Atlanta, GA 30301', 'Logistics Coordinator', 'Supply chain tracking integration'),
('Maria Garcia', 'maria.g@healthcare.com', '+1 (555) 123-4567', '852 Willow St, Phoenix, AZ 85001', 'Healthcare Administrator', 'HIPAA compliant solution needed'),
('Tom Harris', 'tom.h@realestate.co', '+1 (555) 234-5670', '963 Cherry Ave, Las Vegas, NV 89101', 'Real Estate Agent', 'Property management CRM');

-- Seed automations
INSERT INTO automations (name, type, trigger_event, schedule, schedule_type, schedule_frequency, scheduled_at, next_run_at, status, contacts_count, subject, body, from_name) VALUES
('Welcome Email Sequence', 'Email Drip', 'contact.created', 'Scheduled', 'recurring', 'monthly', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour', 'active', 234, 'Welcome to Acodera CRM!', '<h2>Welcome!</h2><p>Thank you for joining Acodera CRM. We''re excited to help you streamline your workflow.</p><p>Best regards,<br/>The Acodera Team</p>', 'Acodera CRM'),
('Follow-up SMS', 'SMS Follow-up', 'contact.created', 'Scheduled', 'once', 'monthly', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days', 'active', 156, '', '', ''),
('Lead Scoring Engine', 'Lead Scoring', 'contact.updated', 'Scheduled', 'recurring', 'weekly', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour', 'active', 892, '', '', ''),
('Monthly Newsletter', 'Marketing Campaign', 'contact.subscribed', 'Scheduled', 'recurring', 'monthly', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days', 'paused', 1204, 'Monthly Update from Acodera', '<h2>Monthly Update</h2><p>Here''s what''s new this month at Acodera CRM...</p>', 'Acodera CRM'),
('Deal Stage Reminder', 'Email Drip', 'deal.stage_change', 'Scheduled', 'recurring', 'biweekly', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour', 'active', 67, 'Deal Stage Update', '<h2>Deal Updated</h2><p>A deal in your pipeline has moved to a new stage. Check it out!</p>', 'Acodera CRM'),
('Win-back Campaign', 'Marketing Campaign', 'deal.lost', 'Scheduled', 'once', 'monthly', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days', 'paused', 89, 'We miss you!', '<h2>Come back to Acodera</h2><p>It''s been a while since your last visit. Here''s a special offer just for you.</p>', 'Acodera CRM'),
('Unpaid Invoice Reminder', 'Invoice Reminder', 'invoice.overdue', 'Scheduled', 'recurring', 'daily', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour', 'active', 0, 'Payment Reminder - {{ticket}}', '<p>You have an unpaid invoice.</p>', 'Acodera CRM');

-- Seed flows
INSERT INTO flows (name, email, value, stage) VALUES
('Sarah Johnson', 'sarah@techcorp.com', 12000, 'qualified'),
('Michael Chen', 'm.chen@innovate.io', 25000, 'proposal'),
('Emily Rodriguez', 'emily.r@startup.co', 8000, 'new'),
('David Kim', 'dkim@globalent.com', 45000, 'contacted'),
('Lisa Thompson', 'lisa.t@mediagroup.com', 15000, 'closed'),
('James Wilson', 'jwilson@retailplus.com', 32000, 'qualified'),
('Anna Martinez', 'anna.m@designhub.io', 18000, 'new'),
('Robert Taylor', 'rtaylor@financepro.com', 55000, 'proposal'),
('Sophie Brown', 'sophie.b@edutech.org', 9000, 'contacted'),
('Chris Anderson', 'chris.a@logistics.net', 28000, 'qualified');

-- Seed reviews
INSERT INTO reviews (name, rating, text, reply) VALUES
('Sarah Johnson', 5, 'Acodera CRM transformed our sales pipeline. The automation features saved us 20+ hours per week. Best investment we made this year.', 'Thank you Sarah! We are thrilled to hear about your time savings. Welcome to the Acodera family!'),
('Michael Chen', 4, 'Great platform overall. The analytics dashboard is incredibly detailed. Would love to see more integration options in the future.', ''),
('Emily Rodriguez', 5, 'The flow management is exactly what our team needed. Moving deals through stages has never been easier. Highly recommend!', ''),
('David Kim', 3, 'Solid CRM but the learning curve is steep for new users. Once you get past the initial setup, it works well.', 'Thanks for the feedback David! We are working on an improved onboarding experience.'),
('Lisa Thompson', 5, 'Customer support is outstanding. Had a complex integration question and they resolved it within hours. The product itself is top-notch.', ''),
('James Wilson', 4, 'Multi-location deployment was seamless. Each of our 12 offices has their own workspace while maintaining centralized reporting.', ''),
('Anna Martinez', 5, 'As a creative agency, we needed something flexible. Acodera custom fields and pipelines are perfect for our workflow.', ''),
('Robert Taylor', 4, 'The compliance features give us peace of mind. Audit trails and data encryption are enterprise-grade. Worth every penny.', ''),
('Sophie Brown', 5, 'Education pricing made this accessible for our institution. The team collaboration features are excellent for our distributed staff.', ''),
('Chris Anderson', 4, 'Supply chain integration works beautifully. Real-time tracking across our entire logistics network. Minor UI quirks but functionality is solid.', '');

-- Seed tickets
INSERT INTO tickets (abbreviation, title, description, price, quantity, location, date_time) VALUES
('TECH', 'Tech Conference 2024', 'Annual technology conference featuring AI and cloud computing.', 250000, 40, 'Jakarta Convention Center', '2024-03-15 09:00:00'),
('MUSI', 'Music Festival Bali', 'Three-day music festival with international artists.', 500000, 100, 'Bali Beach Arena', '2024-04-20 18:00:00'),
('STAR', 'Startup Pitch Night', 'Networking event for startups and investors.', 75000, 30, 'Co-working Space SCBD', '2024-02-28 19:00:00'),
('DESI', 'Design Workshop', 'Hands-on UI/UX design workshop for beginners.', 150000, 20, 'Design Hub Jakarta', '2024-03-10 10:00:00'),
('FOOD', 'Food & Beverage Expo', 'Exhibition of local and international F&B brands.', 100000, 50, 'ICE BSD', '2024-05-05 10:00:00'),
('MARA', 'Marathon Jakarta 2024', 'Full marathon and half marathon race event.', 350000, 200, 'Gelora Bung Karno', '2024-06-01 06:00:00');

-- Seed transactions (combined ticket instances + invoices)
-- Tech Conference 2024 (ticket_id=1)
INSERT INTO transactions (ticket_id, transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, buyer_name, buyer_email, buyer_phone, payment_method, payment_detail, status, purchased_at) VALUES
(1, 'TKT-20240315-001', 'TECH2024031500001', '1234567890001', 1, 250000, 250000, 'Sarah Johnson', 'sarah@techcorp.com', '+1 (555) 012-3456', 'qr_code', '', 'paid', '2024-03-15 09:30:00'),
(1, 'TKT-20240315-002', 'TECH2024031500002', '1234567890002', 1, 250000, 250000, 'Michael Chen', 'm.chen@innovate.io', '+1 (555) 234-5678', 'bank_transfer', 'bca', 'paid', '2024-03-15 10:00:00'),
(1, 'TKT-20240315-003', 'TECH2024031500003', '1234567890003', 1, 250000, 250000, 'Emily Rodriguez', 'emily.r@startup.co', '+1 (555) 345-6789', 'e_wallet', 'dana', 'pending', '2024-03-15 10:30:00'),
(1, 'TKT-AVAIL-TECH2024031500004', 'TECH2024031500004', '1234567890004', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500005', 'TECH2024031500005', '1234567890005', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500006', 'TECH2024031500006', '1234567890006', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500007', 'TECH2024031500007', '1234567890007', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500008', 'TECH2024031500008', '1234567890008', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500009', 'TECH2024031500009', '1234567890009', 1, 250000, 250000, '', '', '', '', '', 'available', NULL),
(1, 'TKT-AVAIL-TECH2024031500010', 'TECH2024031500010', '1234567890010', 1, 250000, 250000, '', '', '', '', '', 'available', NULL);

-- Music Festival Bali (ticket_id=2)
INSERT INTO transactions (ticket_id, transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, buyer_name, buyer_email, buyer_phone, payment_method, payment_detail, status, purchased_at) VALUES
(2, 'TKT-20240420-001', 'MUSI2024042000001', '2345678900001', 1, 500000, 500000, 'James Wilson', 'jwilson@retailplus.com', '+1 (555) 678-9012', 'bank_transfer', 'bri', 'paid', '2024-04-20 18:30:00'),
(2, 'TKT-20240420-002', 'MUSI2024042000002', '2345678900002', 1, 500000, 500000, 'Anna Martinez', 'anna.m@designhub.io', '+1 (555) 789-0123', 'qr_code', '', 'pending', '2024-04-20 19:00:00'),
(2, 'TKT-AVAIL-MUSI2024042000003', 'MUSI2024042000003', '2345678900003', 1, 500000, 500000, '', '', '', '', '', 'available', NULL),
(2, 'TKT-AVAIL-MUSI2024042000004', 'MUSI2024042000004', '2345678900004', 1, 500000, 500000, '', '', '', '', '', 'available', NULL),
(2, 'TKT-AVAIL-MUSI2024042000005', 'MUSI2024042000005', '2345678900005', 1, 500000, 500000, '', '', '', '', '', 'available', NULL);
