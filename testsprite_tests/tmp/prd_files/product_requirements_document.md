# Acodera CRM — Product Requirements Document

## 1. Product Overview

### 1.1 Product Name
Acodera CRM

### 1.2 Product Vision
A comprehensive, multi-tenant Customer Relationship Management (CRM) platform designed for small to medium businesses to manage contacts, sales pipelines, email automation, invoicing, event ticketing, customer reviews, and analytics from a single dashboard.

### 1.3 Target Users
- **Business Owners** — Full control over all features, user management, API keys, audit logs
- **Partners/Staff** — Limited access scoped to their branch
- **End Customers** — Receive invoices, tickets, and automated communications

### 1.4 Tech Stack
- **Frontend:** React 18, React Router DOM 7, Vite 5, Tailwind CSS 3, Framer Motion, Recharts, Zod
- **Backend:** Node.js, Express 4, JWT, bcryptjs, mysql2
- **Database:** MySQL (primary), Supabase (session management)
- **Security:** Helmet, CORS, express-rate-limit, JWT authentication, API key authentication

---

## 2. Core Features

### 2.1 User Authentication (F-P1)
- **Description:** Login, registration, and OAuth (Google/GitHub) authentication
- **Priority:** P0 (Critical)
- **Routes:** `/login`
- **API Endpoints:**
  - `POST /api/auth/login` — Email/password login
  - `POST /api/auth/register` — New user registration
  - `POST /api/auth/oauth` — OAuth callback handler
  - `GET /api/auth/me` — Get current user profile
- **User Flows:**
  1. User enters email + password → clicks Login → JWT token stored → redirected to `/dashboard`
  2. User clicks "Register" → fills name, email, password → account created → redirected to `/dashboard`
  3. User clicks Google/GitHub OAuth → Supabase OAuth flow → session processed → redirected to `/dashboard`
- **Validation:** Zod schemas for login, register, and OAuth payloads

### 2.2 Dashboard (F-P2)
- **Description:** Central summary view with key metrics, charts, and recent activity
- **Priority:** P0 (Critical)
- **Route:** `/dashboard`
- **Widgets:**
  - Total contacts count
  - Total flows (deals) count
  - Total invoices count
  - Total reviews count
  - Revenue chart (Recharts)
  - Flow stage distribution chart
  - Recent reviews list
- **Data Source:** Mock data (src/utils/mockData.js via Supabase)

### 2.3 Contact Management (F-P3)
- **Description:** Full CRUD for customer contacts with search
- **Priority:** P0 (Critical)
- **Routes:** `/dashboard/contacts`, `/dashboard/contacts/new`
- **API Endpoints:**
  - `GET /api/contacts` — List all contacts
  - `POST /api/contacts` — Create contact
  - `PUT /api/contacts/:id` — Update contact
  - `DELETE /api/contacts/:id` — Delete contact
- **Fields:** name, email, phone, address, message, profesi
- **Tenant Isolation:** Branch-based filtering for Partner role

### 2.4 Sales Pipeline / Flows (F-P4)
- **Description:** Kanban-style pipeline for tracking deals through stages
- **Priority:** P0 (Critical)
- **Routes:** `/dashboard/flow`, `/dashboard/flow/new`
- **API Endpoints:**
  - `GET /api/flows` — List all flows
  - `POST /api/flows` — Create flow
  - `PUT /api/flows/:id` — Update flow (stage)
  - `DELETE /api/flows/:id` — Delete flow
- **Stages:** New → Contacted → Qualified → Proposal → Negotiation → Closed Won/Closed Lost
- **Key Feature:** Drag-and-drop between stages

### 2.5 Automation Engine (F-P5)
- **Description:** Email automation campaigns with scheduling and triggers
- **Priority:** P1 (High)
- **Routes:** `/dashboard/automation`, `/dashboard/automation/new`, `/dashboard/automation/:id`
- **API Endpoints:**
  - `GET /api/automations` — List automations
  - `POST /api/automations` — Create automation
  - `PUT /api/automations/:id` — Update automation
  - `PUT /api/automations/:id/toggle` — Toggle active/paused
  - `DELETE /api/automations/:id` — Delete automation
- **Fields:** name, type (email/sms), trigger_event, schedule, status, subject, body, from_name
- **Key Feature:** Automation logs tracking

### 2.6 Invoicing & Payments (F-P6)
- **Description:** Create, preview, download invoices with payment tracking
- **Priority:** P1 (High)
- **Routes:** `/dashboard/invoicing`, `/dashboard/invoicing/new`, `/dashboard/invoicing/:id`, `/dashboard/invoicing/template`
- **Payment Methods:** QR Code, Bank Transfer (BCA/BRI/BNI), E-Wallet (Dana/ShopeePay/LinkAja/OVO)
- **Features:**
  - Invoice CRUD with transaction grouping
  - Invoice preview and download (PNG via html2canvas, PDF via browser print)
  - Invoice template customization (logo, colors, tax rate, footer)
  - Payment information popup
  - Expired invoice tracking
  - Countdown timer for pending invoices
- **Data Source:** Mock data via Supabase (no dedicated backend routes)

### 2.7 Event Tickets (F-P7)
- **Description:** Create and manage event tickets with unique codes
- **Priority:** P2 (Medium)
- **Routes:** `/dashboard/tickets`, `/dashboard/tickets/new`, `/dashboard/tickets/:id`
- **Features:**
  - Ticket type CRUD with title, price, date, time, location
  - Unique code generation per ticket
  - Ticket instance tracking
  - Invoice linking for ticket sales
- **Data Source:** Mock data (no dedicated backend routes)

### 2.8 Customer Reviews (F-P8)
- **Description:** Manage customer reviews with ratings and replies
- **Priority:** P2 (Medium)
- **Routes:** `/dashboard/reviews`
- **API Endpoints:**
  - `GET /api/reviews` — List reviews
  - `POST /api/reviews` — Create review
  - `PUT /api/reviews/:id` — Update review
  - `PUT /api/reviews/:id/reply` — Reply to review
  - `DELETE /api/reviews/:id` — Delete review
- **Fields:** name, rating (1-5), text, reply

### 2.9 Analytics Dashboard (F-P9)
- **Description:** Data visualization with multiple chart types
- **Priority:** P2 (Medium)
- **Route:** `/dashboard/analytics`
- **Charts:**
  - Revenue over time (area/bar chart)
  - Flow stage distribution (pie chart)
  - Contact growth (line chart)
  - Review rating distribution (bar chart)
- **Data Source:** Mock data via Supabase

### 2.10 Trash / Soft Delete (F-P10)
- **Description:** View and restore recently deleted items
- **Priority:** P3 (Low)
- **Route:** `/dashboard/trash`
- **Entities:** Contacts, Automations, Flows, Invoices, Tickets
- **Features:** Tab-based navigation, restore, permanent delete
- **Data Source:** In-memory only (ephemeral)

### 2.11 Admin: User Management (F-P11)
- **Description:** Full user administration for Owner role
- **Priority:** P1 (High)
- **Route:** `/dashboard/admin/users`
- **API Endpoints:**
  - `GET /api/users` — List users (Owner only)
  - `POST /api/users` — Create user (Owner only)
  - `PUT /api/users/:id` — Update user (Owner only)
  - `DELETE /api/users/:id` — Delete user (Owner only)
- **Roles:** owner, partner, user
- **Features:** Branch assignment, role management, self-deletion prevention

### 2.12 Admin: API Keys (F-P12)
- **Description:** Generate and manage API keys for external integrations
- **Priority:** P2 (Medium)
- **Route:** `/dashboard/admin/api-keys`
- **API Endpoints:**
  - `GET /api/api-keys` — List API keys
  - `POST /api/api-keys` — Create API key
  - `DELETE /api/api-keys/:id` — Revoke API key
- **Features:** Key prefix display, rate limiting, audit logging on creation/revocation
- **Key Security:** Full key shown only once at creation

### 2.13 Admin: Audit Logs (F-P13)
- **Description:** Track all user activities with filtering and statistics
- **Priority:** P2 (Medium)
- **Route:** `/dashboard/admin/audit-logs`
- **API Endpoints:**
  - `GET /api/audit-logs` — List logs with pagination and filters
  - `GET /api/audit-logs/stats` — Summary statistics (Owner only)
- **Features:** Action filter, entity type filter, 30-day activity chart

### 2.14 Admin: Payment Gateway (F-P14)
- **Description:** Configure third-party payment gateway providers
- **Priority:** P2 (Medium)
- **Route:** `/dashboard/admin/gateway`
- **API Endpoints:**
  - `GET /api/gateway-config` — Get current config
  - `PUT /api/gateway-config` — Save config
  - `DELETE /api/gateway-config` — Disable gateway
- **Features:** Webhook URL generation, gateway adapter pattern

### 2.15 External REST API (F-P15)
- **Description:** Programmatic access to CRM data via API keys
- **Priority:** P2 (Medium)
- **Base Path:** `/api/external/`
- **Authentication:** Bearer token via API key
- **Endpoints:**
  - Contacts CRUD: `GET/POST/PUT/DELETE /api/external/contacts`
  - Automations: `GET/POST/DELETE /api/external/automations`
  - Flows: `GET/POST/DELETE /api/external/flows`
  - Reviews: `GET/POST/DELETE /api/external/reviews`
- **Tenant Isolation:** Branch-based filtering
- **Rate Limiting:** Per-key rate limits

### 2.16 Webhook Handler (F-P16)
- **Description:** Payment gateway webhook endpoint for transaction updates
- **Priority:** P2 (Medium)
- **Route:** `POST /api/webhook/:gateway/:token`
- **Features:**
  - Gateway adapter lookup (Midtrans, Xendit, etc.)
  - Signature verification
  - Transaction status processing

---

## 3. Non-Functional Requirements

### 3.1 Security
- **NF-1:** JWT-based authentication with token expiry
- **NF-2:** API key authentication for external access
- **NF-3:** Role-based access control (owner, partner, user)
- **NF-4:** Branch/tenant isolation for multi-tenant data
- **NF-5:** Helmet.js security headers
- **NF-6:** Rate limiting on all API routes
- **NF-7:** Password hashing with bcryptjs (10 rounds)
- **NF-8:** CORS configuration for frontend origin

### 3.2 Performance
- **NF-9:** Frontend built with Vite for fast development and optimized production builds
- **NF-10:** MySQL database with parameterized queries to prevent SQL injection
- **NF-11:** Concurrent request handling via Node.js async/await

### 3.3 Usability
- **NF-12:** Dark mode support (system preference and manual toggle)
- **NF-13:** Responsive design (mobile, tablet, desktop)
- **NF-14:** Real-time search and filtering on list pages
- **NF-15:** Framer Motion animations for smooth transitions
- **NF-16:** Tailwind CSS for consistent styling

### 3.4 Deployment
- **NF-17:** Render deployment (static frontend + Node backend + MySQL)
- **NF-18:** Netlify deployment alternative
- **NF-19:** Environment variable configuration for different environments

---

## 4. User Roles & Permissions

| Feature | Owner | Partner | User |
|---------|-------|---------|------|
| Contacts CRUD | Full | Branch-scoped | No |
| Flows CRUD | Full | Branch-scoped | No |
| Automations CRUD | Full | Branch-scoped | No |
| Reviews CRUD | Full | Branch-scoped | No |
| Invoicing | Full | Branch-scoped | No |
| Tickets | Full | Branch-scoped | No |
| User Management | Full | No | No |
| API Keys | All keys | Own keys | No |
| Audit Logs | All logs | Own logs | No |
| Gateway Config | Full | No | No |

---

## 5. Known Limitations & Future Improvements

### 5.1 Current Limitations
1. **Mock Data Dependency:** Invoicing, tickets, and analytics data use mock data (Supabase tables) rather than dedicated backend routes
2. **Database Compatibility:** `gatewayConfig.js` uses PostgreSQL `::jsonb` syntax which will fail on MySQL
3. **Ephemeral Trash:** Soft delete (trash) operates in-memory only
4. **Missing Backend Tables:** No dedicated `invoices`, `tickets`, or `transactions` tables in the backend
5. **Error Handling:** Some pages lack loading skeletons and error boundary coverage

### 5.2 Future Enhancements
1. **Real Invoicing Backend:** Create dedicated invoices and transactions API routes
2. **Real Ticket Backend:** Create tickets API with instance management
3. **Persistent Trash:** Store deleted items in database with TTL
4. **Email Service Integration:** Connect automation engine to real email/SMS providers (SendGrid, Twilio)
5. **Payment Gateway Integration:** Complete Midtrans/Xendit SDK integration
6. **Mobile App:** React Native companion app
7. **Real-time Notifications:** WebSocket for real-time updates
8. **Advanced Reporting:** Custom report builder with export options
9. **File Attachments:** Upload and attach files to contacts, invoices, tickets
10. **Email Templates:** WYSIWYG email template editor for automations

---

## 6. Database Schema

### 6.1 Core Tables
- **users:** id, email, password, name, role, branch, branch_id, payment_gateway, gateway_config, invoice_template, gateway_webhook_token, created_at
- **contacts:** id, name, email, phone, address, message, profesi, branch, created_at
- **flows:** id, name, email, value, stage, branch, created_at
- **automations:** id, name, type, trigger_event, schedule, status, contacts_count, subject, body, from_name, branch, created_at
- **reviews:** id, name, rating, text, reply, created_at
- **api_keys:** id, user_id, key_hash, key_prefix, name, status, rate_limit, last_used_at, created_at
- **audit_logs:** id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at

### 6.2 Future Tables (pending backend implementation)
- **invoices:** id, transaction_id, customer info, items, payment info, status, branch, created_at
- **tickets:** id, title, price, date, location, abbreviation, branch, created_at
- **ticket_instances:** id, ticket_id, unique_code, buyer_info, status, purchased_at
- **transactions:** id, invoice_id, gateway, status, amount, gross_amount, buyer_email, created_at
- **automation_logs:** id, automation_id, contact_id, status, sent_at, error
- **scheduled_emails:** id, automation_id, contact_id, scheduled_at, sent_at, status
