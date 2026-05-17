-- Tenancy Seed: Encrypted branch IDs (16-digit random identifiers)
-- Branch mapping: users.branch = display name, users.branch_id = 16-digit encrypted ID
-- Data tables use branch_id (not the branch name) for tenant isolation

-- 1. Add branch columns where missing
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT NULL;

-- 2. Clear existing data
DELETE FROM automation_logs;
DELETE FROM scheduled_emails;
DELETE FROM transactions;
DELETE FROM tickets;
DELETE FROM reviews;
DELETE FROM flows;
DELETE FROM automations;
DELETE FROM contacts;

-- ====================================================================
-- DATA FOR: Sicapung Branch (branch_id = 4803872853222343)
-- Partner: sicapung01@gmail.com
-- ====================================================================

-- Contacts
INSERT INTO contacts (name, email, phone, address, profesi, message, branch) VALUES
('Rina Wijaya', 'rina.wijaya@smk1.sch.id', '0812-3456-7890', 'Jl. Merdeka No. 45, Jakarta', 'Teacher', 'Interested in our learning management system for 200 students', '4803872853222343'),
('Bambang Sutrisno', 'bambang@universitasx.ac.id', '0856-7890-1234', 'Kampus Universitas X, Jl. Pendidikan No. 10, Bandung', 'Lecturer', 'Need a CRM solution for student admissions tracking', '4803872853222343'),
('Dewi Lestari', 'dewi.lestari@yayasanpeduli.org', '0878-4567-8901', 'Jl. Sosial No. 22, Yogyakarta', 'NGO Coordinator', 'Looking for donor management and communication tools', '4803872853222343'),
('Ahmad Fauzi', 'ahmad.fauzi@bimbelcerdas.com', '0813-2345-6789', 'Ruko Bimbel Cerdas, Jl. Sudirman No. 8, Semarang', 'Tutor', 'Want to automate student follow-up emails', '4803872853222343'),
('Siti Nurhaliza', 'siti@sekolahalam.id', '0821-9876-5432', 'Jl. Alam Hijau No. 3, Bogor', 'Principal', 'Evaluating CRM platforms for school administration', '4803872853222343');

-- Flows (deals)
INSERT INTO flows (name, email, value, stage, branch) VALUES
('SMA Nusantara Partnership', 'admin@smanusantara.sch.id', 50000000, 'negotiation', '4803872853222343'),
('Universitas X Campus License', 'bambang@universitasx.ac.id', 120000000, 'proposal', '4803872853222343'),
('Bimbel Cerdas Subscription', 'ahmad.fauzi@bimbelcerdas.com', 15000000, 'qualified', '4803872853222343'),
('Yayasan Peduli Annual Plan', 'dewi.lestari@yayasanpeduli.org', 75000000, 'new', '4803872853222343'),
('Sekolah Alam CRM Pilot', 'siti@sekolahalam.id', 25000000, 'contacted', '4803872853222343');

-- Automations
INSERT INTO automations (name, type, trigger_event, schedule_type, schedule_frequency, status, contacts_count, branch) VALUES
('Welcome Sequence for New Students', 'email', 'contact.created', 'once', 'monthly', 'active', 0, '4803872853222343'),
('Weekly Learning Progress Report', 'email', 'schedule', 'recurring', 'weekly', 'active', 0, '4803872853222343'),
('Payment Reminder - School Fees', 'email', 'schedule', 'recurring', 'monthly', 'active', 0, '4803872853222343');

-- Reviews
INSERT INTO reviews (name, rating, text, reply, branch) VALUES
('Rina Wijaya', 5, 'Very responsive team! Helped us set up the system quickly.', 'Thank you Rina! We are glad to help.', '4803872853222343'),
('Bambang Sutrisno', 4, 'Good platform but could use more customization options.', 'Thank you for the feedback, Bambang. We are adding more options soon.', '4803872853222343'),
('Dewi Lestari', 5, 'The donor management features are exactly what we needed.', 'We are thrilled to support your cause!', '4803872853222343'),
('Kepala Sekolah SMA Nusantara', 4, 'Impressive demo. Looking forward to the implementation.', null, '4803872853222343');

-- Tickets
INSERT INTO tickets (abbreviation, title, description, price, quantity, location, date_time, branch) VALUES
('SEMNAS', 'Seminar Nasional Pendidikan 2026', 'Annual education seminar with keynote speakers from Ministry of Education', 150000, 500, 'Jakarta Convention Center', '2026-06-15 09:00:00+07', '4803872853222343'),
('WKSOP', 'Workshop Kurikulum Merdeka', 'Hands-on workshop for implementing the Merdeka curriculum', 250000, 100, 'Hotel Santika, Bandung', '2026-07-20 08:00:00+07', '4803872853222343');

-- Add available ticket instances for Sicapung tickets
WITH ticket_ref AS (SELECT id, abbreviation, date_time, price FROM tickets WHERE branch = '4803872853222343')
INSERT INTO transactions (ticket_id, transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, status, branch)
SELECT
  t.id,
  'TKT-AVAIL-' || t.abbreviation || to_char(t.date_time, 'YYYYMMDD') || LPAD(gs::text, 5, '0'),
  t.abbreviation || to_char(t.date_time, 'YYYYMMDD') || LPAD(gs::text, 5, '0'),
  LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'),
  1,
  t.price,
  t.price,
  'available',
  '4803872853222343'
FROM ticket_ref t, generate_series(1, t.quantity) AS gs;

-- ====================================================================
-- DATA FOR: Altiansyah Branch (branch_id = 5241315729344337)
-- Partner: altiansyah24@gmail.com
-- ====================================================================

-- Contacts
INSERT INTO contacts (name, email, phone, address, profesi, message, branch) VALUES
('Hendra Gunawan', 'hendra@tokosukses.com', '0811-2222-3333', 'Jl. Dagang No. 77, Surabaya', 'Business Owner', 'Looking for invoice management system for my retail store', '5241315729344337'),
('Maya Putri', 'maya.putri@kantorhukum.com', '0855-4444-5555', 'Jl. Profesional No. 12, Jakarta', 'Lawyer', 'Need CRM to track client communications and case updates', '5241315729344337'),
('Fahri Ramadhan', 'fahri@startup.id', '0877-6666-7777', 'Co-Working Space, Jl. Digital No. 5, Bandung', 'Startup Founder', 'Looking for automation tools for our growing customer base', '5241315729344337'),
('Nina Marpaung', 'nina.marpaung@hotelgrand.com', '0815-8888-9999', 'Hotel Grand, Jl. Wisata No. 1, Bali', 'Hotel Manager', 'Need a system to manage guest communications and bookings', '5241315729344337'),
('Andi Pratama', 'andi@rumahsakitsehat.com', '0822-1111-2222', 'RS Sehat, Jl. Medika No. 34, Makassar', 'Hospital Admin', 'Evaluating CRM for patient follow-up and appointment reminders', '5241315729344337');

-- Flows (deals)
INSERT INTO flows (name, email, value, stage, branch) VALUES
('Toko Sukses Retail Package', 'hendra@tokosukses.com', 35000000, 'negotiation', '5241315729344337'),
('Startup.id Growth Plan', 'fahri@startup.id', 60000000, 'proposal', '5241315729344337'),
('Hotel Grand CRM Pilot', 'nina.marpaung@hotelgrand.com', 45000000, 'qualified', '5241315729344337'),
('Kantor Hukum Annual Retainer', 'maya.putri@kantorhukum.com', 28000000, 'new', '5241315729344337'),
('RS Sehat Patient System', 'andi@rumahsakitsehat.com', 95000000, 'contacted', '5241315729344337');

-- Automations
INSERT INTO automations (name, type, trigger_event, schedule_type, schedule_frequency, status, contacts_count, branch) VALUES
('Customer Birthday Greetings', 'email', 'schedule', 'recurring', 'daily', 'active', 0, '5241315729344337'),
('Invoice Reminder Sequence', 'email', 'schedule', 'recurring', 'weekly', 'active', 0, '5241315729344337'),
('New Client Onboarding', 'email', 'contact.created', 'once', 'monthly', 'active', 0, '5241315729344337');

-- Reviews
INSERT INTO reviews (name, rating, text, reply, branch) VALUES
('Hendra Gunawan', 5, 'The invoicing system saved us hours of manual work!', 'Thank you Hendra! Happy to help your business grow.', '5241315729344337'),
('Maya Putri', 4, 'Clean interface and easy to use. Would love more template options.', 'Great suggestion, Maya. We are expanding our templates.', '5241315729344337'),
('Fahri Ramadhan', 5, 'Automation features are incredible. Our team loves it.', null, '5241315729344337'),
('Nina Marpaung', 3, 'Good system but could be faster during peak hours.', 'Thanks Nina, we are optimizing our infrastructure.', '5241315729344337');

-- Tickets
INSERT INTO tickets (abbreviation, title, description, price, quantity, location, date_time, branch) VALUES
('BIZCON', 'Business Growth Conference 2026', 'Annual conference for SMEs with networking and workshops', 200000, 300, 'Surabaya Convention Hall', '2026-08-10 09:00:00+07', '5241315729344337'),
('NETW', 'Networking Night - Q3 2026', 'Evening networking event for professionals and entrepreneurs', 100000, 150, 'The Rooftop Lounge, Jakarta', '2026-09-05 18:00:00+07', '5241315729344337');

-- Add available ticket instances for Altiansyah tickets
WITH ticket_ref AS (SELECT id, abbreviation, date_time, price FROM tickets WHERE branch = '5241315729344337')
INSERT INTO transactions (ticket_id, transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, status, branch)
SELECT
  t.id,
  'TKT-AVAIL-' || t.abbreviation || to_char(t.date_time, 'YYYYMMDD') || LPAD(gs::text, 5, '0'),
  t.abbreviation || to_char(t.date_time, 'YYYYMMDD') || LPAD(gs::text, 5, '0'),
  LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'),
  1,
  t.price,
  t.price,
  'available',
  '5241315729344337'
FROM ticket_ref t, generate_series(1, t.quantity) AS gs;

-- ====================================================================
-- DATA FOR: Owner (acoderaAdmin — sees ALL data, branch = NULL = all branches)
-- ====================================================================

INSERT INTO contacts (name, email, phone, address, profesi, message, branch) VALUES
('Global Tech Partners', 'info@globaltech.com', '+1-555-0100', '1000 Silicon Valley Blvd, CA 94025', 'Enterprise Client', 'Interested in enterprise-wide CRM deployment', NULL),
('Acodera Internal Team', 'internal@acodera.com', '021-1234-5678', 'Acodera HQ, Jakarta', 'Internal', 'Platform improvement suggestions from the team', NULL);

INSERT INTO flows (name, email, value, stage, branch) VALUES
('Enterprise License - Global Tech', 'info@globaltech.com', 500000000, 'negotiation', NULL),
('Acodera Platform v3 Launch', 'product@acodera.com', 0, 'closed', NULL);

INSERT INTO reviews (name, rating, text, reply, branch) VALUES
('Global Tech Partners', 5, 'Excellent platform with comprehensive features.', 'Thank you! We look forward to the partnership.', NULL),
('Acodera Team', 4, 'Great internal tool for managing our operations.', null, NULL);

INSERT INTO automations (name, type, trigger_event, schedule_type, schedule_frequency, status, contacts_count, branch) VALUES
('System Health Monitoring', 'email', 'schedule', 'recurring', 'daily', 'active', 0, NULL),
('Weekly Analytics Report', 'email', 'schedule', 'recurring', 'weekly', 'active', 0, NULL);

-- ====================================================================
-- Transaction invoices (sample purchases)
-- ====================================================================

-- Sicapung: a sold ticket (1 paid, 1 pending)
WITH t AS (SELECT id FROM tickets WHERE abbreviation = 'SEMNAS' AND branch = '4803872853222343' LIMIT 1)
UPDATE transactions SET
  transaction_id = 'TKT-20260513-001',
  status = 'paid',
  buyer_name = 'Rina Wijaya',
  buyer_email = 'rina.wijaya@smk1.sch.id',
  buyer_phone = '0812-3456-7890',
  payment_method = 'bank_transfer',
  payment_detail = 'BCA - 1234567890',
  purchased_at = NOW()
FROM t
WHERE transactions.ticket_id = t.id AND transactions.status = 'available'
LIMIT 2;

WITH t AS (SELECT id FROM tickets WHERE abbreviation = 'WKSOP' AND branch = '4803872853222343' LIMIT 1)
UPDATE transactions SET
  transaction_id = 'TKT-20260513-002',
  status = 'pending',
  buyer_name = 'Bambang Sutrisno',
  buyer_email = 'bambang@universitasx.ac.id',
  buyer_phone = '0856-7890-1234',
  payment_method = 'gopay',
  purchased_at = NOW()
FROM t
WHERE transactions.ticket_id = t.id AND transactions.status = 'available'
LIMIT 1;

-- Altiansyah: a sold ticket
WITH t AS (SELECT id FROM tickets WHERE abbreviation = 'BIZCON' AND branch = '5241315729344337' LIMIT 1)
UPDATE transactions SET
  transaction_id = 'TKT-20260512-001',
  status = 'paid',
  buyer_name = 'Hendra Gunawan',
  buyer_email = 'hendra@tokosukses.com',
  buyer_phone = '0811-2222-3333',
  payment_method = 'bank_transfer',
  payment_detail = 'Mandiri - 9876543210',
  purchased_at = NOW()
FROM t
WHERE transactions.ticket_id = t.id AND transactions.status = 'available'
LIMIT 1;

-- Direct invoices for Sicapung
INSERT INTO transactions (transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, buyer_name, buyer_email, buyer_phone, payment_method, payment_detail, status, purchased_at, branch) VALUES
('INV-SCG-001', 'SCG-CONSULT-001', LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'), 1, 5000000, 5000000, 'SMA Nusantara', 'admin@smanusantara.sch.id', '021-555-0101', 'bank_transfer', 'BNI - 1122334455', 'paid', NOW() - INTERVAL '5 days', '4803872853222343'),
('INV-SCG-002', 'SCG-LICENSE-001', LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'), 1, 10000000, 10000000, 'Universitas X', 'bambang@universitasx.ac.id', '022-555-0202', 'bank_transfer', 'BCA - 9988776655', 'pending', NOW() - INTERVAL '2 days', '4803872853222343');

-- Direct invoices for Altiansyah
INSERT INTO transactions (transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, buyer_name, buyer_email, buyer_phone, payment_method, payment_detail, status, purchased_at, branch) VALUES
('INV-ALT-001', 'ALT-CONSULT-001', LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'), 1, 7500000, 7500000, 'Toko Sukses', 'hendra@tokosukses.com', '031-555-0303', 'bank_transfer', 'Mandiri - 5566778899', 'paid', NOW() - INTERVAL '7 days', '5241315729344337'),
('INV-ALT-002', 'ALT-RETAINER-001', LPAD(floor(random() * 9999999999999)::bigint::text, 13, '0'), 1, 5000000, 15000000, 'Kantor Hukum Maya', 'maya.putri@kantorhukum.com', '021-555-0404', 'bank_transfer', 'BCA - 2233445566', 'paid', NOW() - INTERVAL '1 day', '5241315729344337');

-- ====================================================================
-- Update users table: branch = display name, branch_id = encrypted 16-digit ID
-- ====================================================================
UPDATE users SET branch = 'Sicapung', branch_id = '4803872853222343' WHERE email = 'sicapung01@gmail.com';
UPDATE users SET branch = 'Altiansyah', branch_id = '5241315729344337' WHERE email = 'altiansyah24@gmail.com';
UPDATE users SET branch = NULL, branch_id = NULL WHERE email = 'acoderaAdmin@gmail.com';
