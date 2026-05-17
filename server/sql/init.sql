CREATE DATABASE IF NOT EXISTS acodera_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE acodera_crm;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Automations table
CREATE TABLE IF NOT EXISTS automations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(255),
  schedule VARCHAR(255),
  status ENUM('active','paused') DEFAULT 'active',
  contacts_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Flows table
CREATE TABLE IF NOT EXISTS flows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  value DECIMAL(10,2) DEFAULT 0,
  stage VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rating INT NOT NULL,
  text TEXT,
  reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert admin user (password: education123, hashed with bcrypt)
INSERT IGNORE INTO users (email, password, name, role) VALUES (
  'acoderaAdmin@gmail.com',
  '$2a$10$Cjw10E97pzZ2Py5dMYZv7.CgZH28C4D0KKELh72fkcUmFzl4DswLu',
  'Acodera Admin',
  'Administrator'
);

-- Seed contacts
INSERT INTO contacts (name, email, phone, address, message) VALUES
('Sarah Johnson', 'sarah@techcorp.com', '+1 (555) 012-3456', '123 Oak Street, Portland, OR 97201', 'Interested in enterprise plan'),
('Michael Chen', 'm.chen@innovate.io', '+1 (555) 234-5678', '456 Pine Ave, San Francisco, CA 94102', 'Requesting demo for team of 50'),
('Emily Rodriguez', 'emily.r@startup.co', '+1 (555) 345-6789', '789 Elm Blvd, Austin, TX 73301', 'Looking for CRM integration'),
('David Kim', 'dkim@globalent.com', '+1 (555) 456-7890', '321 Maple Dr, Seattle, WA 98101', 'Needs custom workflow setup'),
('Lisa Thompson', 'lisa.t@mediagroup.com', '+1 (555) 567-8901', '654 Cedar Ln, Denver, CO 80201', 'Annual contract renewal'),
('James Wilson', 'jwilson@retailplus.com', '+1 (555) 678-9012', '987 Birch St, Chicago, IL 60601', 'Multi-location deployment'),
('Anna Martinez', 'anna.m@designhub.io', '+1 (555) 789-0123', '147 Walnut Way, Miami, FL 33101', 'Creative team pipeline'),
('Robert Taylor', 'rtaylor@financepro.com', '+1 (555) 890-1234', '258 Spruce Ct, Boston, MA 02101', 'Compliance requirements discussion'),
('Sophie Brown', 'sophie.b@edutech.org', '+1 (555) 901-2345', '369 Ash Rd, Nashville, TN 37201', 'Education sector pricing inquiry'),
('Chris Anderson', 'chris.a@logistics.net', '+1 (555) 012-9876', '741 Poplar Pl, Atlanta, GA 30301', 'Supply chain tracking integration'),
('Maria Garcia', 'maria.g@healthcare.com', '+1 (555) 123-4567', '852 Willow St, Phoenix, AZ 85001', 'HIPAA compliant solution needed'),
('Tom Harris', 'tom.h@realestate.co', '+1 (555) 234-5670', '963 Cherry Ave, Las Vegas, NV 89101', 'Property management CRM');

-- Seed automations
INSERT INTO automations (name, type, trigger_event, schedule, status, contacts_count) VALUES
('Welcome Email Sequence', 'Email Drip', 'New contact added', 'Immediate + 3 day intervals', 'active', 234),
('Follow-up SMS', 'SMS Follow-up', 'No response in 48h', 'Every 2 days', 'active', 156),
('Lead Scoring Engine', 'Lead Scoring', 'Contact interaction', 'Real-time', 'active', 892),
('Monthly Newsletter', 'Marketing Campaign', 'First of month', 'Monthly', 'paused', 1204),
('Deal Stage Reminder', 'Email Drip', 'Stage change', '24h after change', 'active', 67),
('Win-back Campaign', 'Marketing Campaign', 'Inactive 30 days', 'Weekly for 4 weeks', 'paused', 89);

-- Seed flows
INSERT INTO flows (name, email, value, stage) VALUES
('Sarah Johnson', 'sarah@techcorp.com', 12000.00, 'qualified'),
('Michael Chen', 'm.chen@innovate.io', 25000.00, 'proposal'),
('Emily Rodriguez', 'emily.r@startup.co', 8000.00, 'new'),
('David Kim', 'dkim@globalent.com', 45000.00, 'contacted'),
('Lisa Thompson', 'lisa.t@mediagroup.com', 15000.00, 'closed'),
('James Wilson', 'jwilson@retailplus.com', 32000.00, 'qualified'),
('Anna Martinez', 'anna.m@designhub.io', 18000.00, 'new'),
('Robert Taylor', 'rtaylor@financepro.com', 55000.00, 'proposal'),
('Sophie Brown', 'sophie.b@edutech.org', 9000.00, 'contacted'),
('Chris Anderson', 'chris.a@logistics.net', 28000.00, 'qualified');

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
