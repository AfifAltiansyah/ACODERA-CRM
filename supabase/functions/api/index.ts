import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, jsonResponse, verifyToken, runSql } from './lib.ts'
import { handleAuthLogin, handleAuthRegister, handleAuthOAuth, handleAuthMe, handleSendCode, handleVerifyCode, handleResetPassword, handleUsers, handleApiKeys, handleAuditLogs, handleInvoiceTemplate, handleGatewayConfig, handleDataRoute, handleExternal } from './routes.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(), status: 204 })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/api/, '').replace(/^\/api/, '') || '/'

  try {
    return await route(req, path, req.method)
  } catch (err) {
    console.error('Unhandled error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})

async function route(req: Request, path: string, method: string): Promise<Response> {
  if (path === '/' || path === '/health') {
    return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
  }

  if (path.startsWith('/auth/register')) {
    return handleAuthRegister(req)
  }

  if (path.startsWith('/auth/oauth')) {
    return handleAuthOAuth(req)
  }

  if (path.startsWith('/auth/send-code')) {
    return handleSendCode(req)
  }

  if (path.startsWith('/auth/verify-code')) {
    return handleVerifyCode(req)
  }

  if (path.startsWith('/auth/reset-password')) {
    return handleResetPassword(req)
  }

  if (path.startsWith('/auth/login')) {
    return handleAuthLogin(req)
  }

  if (path.startsWith('/auth/me')) {
    const user = await authenticateReq(req)
    if (!user) return jsonResponse({ error: 'Authentication required' }, 401)
    return handleAuthMe(user)
  }

  if (path.startsWith('/users')) {
    return handleUsers(req, method, path)
  }

  if (path.startsWith('/api-keys')) {
    return handleApiKeys(req, method, path)
  }

  if (path.startsWith('/audit-logs')) {
    return handleAuditLogs(req, method, path)
  }

  if (path.startsWith('/external')) {
    return handleExternal(req, method, path)
  }

  if (path.startsWith('/invoice-template')) {
    return handleInvoiceTemplate(req, method)
  }

  if (path.startsWith('/gateway-config')) {
    return handleGatewayConfig(req, method)
  }

  const entityMatch = path.match(/^\/(contacts|flows|automations|reviews)(\/.*)?$/)
  if (entityMatch) {
    return handleDataRoute(entityMatch[1], req, method, path)
  }

  if (path === '/seed') {
    return handleSeed(req)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

async function handleSeed(req: Request): Promise<Response> {
  const seedSecret = Deno.env.get('SEED_SECRET')
  if (!seedSecret) {
    return jsonResponse({ error: 'Seed endpoint is disabled' }, 403)
  }
  const url = new URL(req.url)
  const pass = url.searchParams.get('pass')
  if (pass !== seedSecret) {
    return jsonResponse({ error: 'Invalid pass parameter' }, 403)
  }

  const sql = `
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT NULL;
CREATE TABLE IF NOT EXISTS verification_codes (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, type TEXT NOT NULL, verified BOOLEAN DEFAULT FALSE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
DELETE FROM automation_logs; DELETE FROM scheduled_emails;
DELETE FROM transactions; DELETE FROM tickets;
DELETE FROM reviews; DELETE FROM flows;
DELETE FROM automations; DELETE FROM contacts;
INSERT INTO contacts (name, email, phone, address, profesi, message, branch) VALUES
('Rina Wijaya','rina.wijaya@smk1.sch.id','0812-3456-7890','Jl. Merdeka No. 45, Jakarta','Teacher','Interested in our LMS for 200 students','4803872853222343'),
('Bambang Sutrisno','bambang@universitasx.ac.id','0856-7890-1234','Kampus Universitas X, Bandung','Lecturer','Need CRM for student admissions','4803872853222343'),
('Dewi Lestari','dewi.lestari@yayasanpeduli.org','0878-4567-8901','Jl. Sosial No. 22, Yogyakarta','NGO Coordinator','Looking for donor management tools','4803872853222343'),
('Ahmad Fauzi','ahmad.fauzi@bimbelcerdas.com','0813-2345-6789','Ruko Bimbel Cerdas, Semarang','Tutor','Want to automate student follow-up emails','4803872853222343'),
('Siti Nurhaliza','siti@sekolahalam.id','0821-9876-5432','Jl. Alam Hijau No. 3, Bogor','Principal','Evaluating CRM for school administration','4803872853222343'),
('Hendra Gunawan','hendra@tokosukses.com','0811-2222-3333','Jl. Dagang No. 77, Surabaya','Business Owner','Looking for invoice management','5241315729344337'),
('Maya Putri','maya.putri@kantorhukum.com','0855-4444-5555','Jl. Profesional No. 12, Jakarta','Lawyer','Need CRM for client communications','5241315729344337'),
('Fahri Ramadhan','fahri@startup.id','0877-6666-7777','Co-Working Space, Bandung','Startup Founder','Looking for automation tools','5241315729344337'),
('Nina Marpaung','nina.marpaung@hotelgrand.com','0815-8888-9999','Hotel Grand, Bali','Hotel Manager','Need system for guest communications','5241315729344337'),
('Andi Pratama','andi@rumahsakitsehat.com','0822-1111-2222','RS Sehat, Makassar','Hospital Admin','Evaluating CRM for patient follow-up','5241315729344337'),
('Global Tech Partners','info@globaltech.com','+1-555-0100','1000 Silicon Valley Blvd, CA','Enterprise Client','Interested in enterprise-wide CRM',NULL),
('Acodera Internal Team','internal@acodera.com','021-1234-5678','Acodera HQ, Jakarta','Internal','Platform improvement suggestions',NULL);
INSERT INTO flows (name, email, value, stage, branch) VALUES
('SMA Nusantara Partnership','admin@smanusantara.sch.id',50000000,'negotiation','4803872853222343'),
('Universitas X Campus License','bambang@universitasx.ac.id',120000000,'proposal','4803872853222343'),
('Bimbel Cerdas Subscription','ahmad.fauzi@bimbelcerdas.com',15000000,'qualified','4803872853222343'),
('Yayasan Peduli Annual Plan','dewi.lestari@yayasanpeduli.org',75000000,'new','4803872853222343'),
('Sekolah Alam CRM Pilot','siti@sekolahalam.id',25000000,'contacted','4803872853222343'),
('Toko Sukses Retail Package','hendra@tokosukses.com',35000000,'negotiation','5241315729344337'),
('Startup.id Growth Plan','fahri@startup.id',60000000,'proposal','5241315729344337'),
('Hotel Grand CRM Pilot','nina.marpaung@hotelgrand.com',45000000,'qualified','5241315729344337'),
('Kantor Hukum Annual Retainer','maya.putri@kantorhukum.com',28000000,'new','5241315729344337'),
('RS Sehat Patient System','andi@rumahsakitsehat.com',95000000,'contacted','5241315729344337'),
('Enterprise License - Global Tech','info@globaltech.com',500000000,'negotiation',NULL),
('Acodera Platform v3 Launch','product@acodera.com',0,'closed',NULL);
INSERT INTO automations (name, type, trigger_event, schedule_type, schedule_frequency, status, contacts_count, branch) VALUES
('Welcome Sequence for New Students','email','contact.created','once','monthly','active',0,'4803872853222343'),
('Weekly Learning Progress Report','email','schedule','recurring','weekly','active',0,'4803872853222343'),
('Payment Reminder - School Fees','email','schedule','recurring','monthly','active',0,'4803872853222343'),
('Customer Birthday Greetings','email','schedule','recurring','daily','active',0,'5241315729344337'),
('Invoice Reminder Sequence','email','schedule','recurring','weekly','active',0,'5241315729344337'),
('New Client Onboarding','email','contact.created','once','monthly','active',0,'5241315729344337'),
('System Health Monitoring','email','schedule','recurring','daily','active',0,NULL),
('Weekly Analytics Report','email','schedule','recurring','weekly','active',0,NULL);
INSERT INTO reviews (name, rating, text, reply, branch) VALUES
('Rina Wijaya',5,'Very responsive team! Helped us set up quickly.','Thank you Rina!','4803872853222343'),
('Bambang Sutrisno',4,'Good platform but could use more customization.','Thanks for the feedback!','4803872853222343'),
('Dewi Lestari',5,'Donor management features are exactly what we needed.','Thrilled to support your cause!','4803872853222343'),
('Kepala Sekolah SMA Nusantara',4,'Impressive demo. Looking forward to implementation.',NULL,'4803872853222343'),
('Hendra Gunawan',5,'Invoicing system saved us hours of manual work!','Happy to help your business grow!','5241315729344337'),
('Maya Putri',4,'Clean interface. Would love more templates.','Expanding our templates soon!','5241315729344337'),
('Fahri Ramadhan',5,'Automation features are incredible!',NULL,'5241315729344337'),
('Nina Marpaung',3,'Good but could be faster during peak hours.','Optimizing our infrastructure.','5241315729344337'),
('Global Tech Partners',5,'Excellent platform with comprehensive features.','Thank you! Looking forward to the partnership.',NULL),
('Acodera Team',4,'Great internal tool.',NULL,NULL);
INSERT INTO tickets (abbreviation, title, description, price, quantity, location, date_time, branch) VALUES
('SEMNAS','Seminar Nasional Pendidikan 2026','Annual education seminar',150000,500,'Jakarta Convention Center','2026-06-15 09:00:00+07','4803872853222343'),
('WKSOP','Workshop Kurikulum Merdeka','Hands-on workshop',250000,100,'Hotel Santika, Bandung','2026-07-20 08:00:00+07','4803872853222343'),
('BIZCON','Business Growth Conference 2026','Annual SME conference',200000,300,'Surabaya Convention Hall','2026-08-10 09:00:00+07','5241315729344337'),
('NETW','Networking Night Q3 2026','Evening networking event',100000,150,'The Rooftop Lounge, Jakarta','2026-09-05 18:00:00+07','5241315729344337');
INSERT INTO transactions (ticket_id, transaction_id, unique_code, barcode, quantity, price_per_unit, total_amount, status, branch)
SELECT t.id,'TKT-AVAIL-'||t.abbreviation||to_char(t.date_time,'YYYYMMDD')||LPAD(gs::text,5,'0'),t.abbreviation||to_char(t.date_time,'YYYYMMDD')||LPAD(gs::text,5,'0'),LPAD(floor(random()*9999999999999)::bigint::text,13,'0'),1,t.price,t.price,'available',t.branch
FROM tickets t, generate_series(1,t.quantity) gs;
UPDATE users SET branch='Sicapung',branch_id='4803872853222343' WHERE email='sicapung01@gmail.com';
UPDATE users SET branch='Altiansyah',branch_id='5241315729344337' WHERE email='altiansyah24@gmail.com';
UPDATE users SET branch=NULL,branch_id=NULL WHERE email='acoderaAdmin@gmail.com';
`;

  const result = await runSql(sql)
  if (!result.success) {
    return jsonResponse({ error: 'Seed failed: ' + result.message }, 500)
  }

  return jsonResponse({ success: true, message: 'Database seeded successfully with branch data' })
}

async function authenticateReq(req: Request): Promise<Record<string, unknown> | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    return verifyToken(auth.slice(7)) as any
  } catch {
    return null
  }
}
