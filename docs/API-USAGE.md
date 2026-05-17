# Acodera CRM — External API Access

There are **two ways** to access CRM data externally:

| Method | Who | Best For |
|--------|-----|----------|
| **Supabase Direct** | Super admin | Full data access, no auth checks |
| **API Key (Backend)** | Owner & Partner | Tenant-isolated, rate-limited, logged |

---

## Method 1: Supabase Direct Access (Admin Only)

Connect directly to Supabase for full data access. No tenant isolation.

### Connection
```javascript
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  'https://rthxlprgtfuhntpcdhsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHhscHJndGZ1aG50cGNkaHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDkzNTUsImV4cCI6MjA5MzkyNTM1NX0.men8PNFnr8Na3H53pjX4dzg9FGQH8dCNefVKti5M-UM'
)
```

### Example: Get Contacts
```javascript
const { data } = await db.from('contacts').select('*')
```

See [Supabase API Docs](https://supabase.com/docs) for the full query reference.

---

## Method 2: API Key Access (Recommended)

Use the **Express backend** with an API key for tenant-isolated, rate-limited, audited access.

### Getting an API Key

1. **Owner**: Log in → go to **API Keys** → click **New Key**
2. **Partner**: Log in → go to **API Keys** → click **New Key**

Each key has:
- A **name** for identification
- A **rate limit** (requests per hour, default 100)
- A **full key** shown only once at creation

### Making API Requests

All requests require the `x-api-key` header:

```bash
curl -H "x-api-key: acd_ABC123_4f6a8b2c..." \
  https://your-server.com/api/external/contacts
```

**Base URL**: Your Express backend URL (e.g. `https://crm-backend.onrender.com`)

### Authentication Errors

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid API key |
| `429` | Rate limit exceeded |

### Owner vs Partner — What Data Do You See?

| Role | API Key Scope | Data Access |
|------|---------------|-------------|
| **Owner** | Full access | All branches, all records |
| **Partner** | Branch-scoped | Only records with `branch = <your branch>` |

### Endpoints

All endpoints return JSON. All require `x-api-key` header.

#### Contacts

```
GET /api/external/contacts          — List all contacts (filtered by tenant)
GET /api/external/contacts/:id      — Get single contact
POST /api/external/contacts         — Create contact
PUT /api/external/contacts/:id      — Update contact
DELETE /api/external/contacts/:id   — Delete contact
```

**Example**: Create a contact
```bash
curl -X POST https://your-server.com/api/external/contacts \
  -H "x-api-key: acd_ABC123_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "phone": "+62812..."}'
```

#### Automations

```
GET /api/external/automations       — List automations
GET /api/external/automations/:id   — Get single automation
POST /api/external/automations      — Create automation
PUT /api/external/automations/:id   — Update automation
DELETE /api/external/automations/:id — Delete automation
```

#### Flows (Deals Pipeline)

```
GET /api/external/flows             — List flows
POST /api/external/flows            — Create flow
PUT /api/external/flows/:id         — Update flow stage
DELETE /api/external/flows/:id      — Delete flow
```

#### Reviews

```
GET /api/external/reviews           — List reviews
POST /api/external/reviews          — Create review
PUT /api/external/reviews/:id       — Update review reply
DELETE /api/external/reviews/:id    — Delete review
```

---

## Rate Limiting

| Limit | Scope | Reset |
|-------|-------|-------|
| 200 req/min | Per IP (global) | Every minute |
| Configurable (default 100/hr) | Per API key | Every hour |

When exceeded, the API returns `429 Too Many Requests`.

---

## Audit Logging

Every API call via API key is logged with:
- API key ID + prefix
- User ID + email
- Action (entity + method)
- IP address
- User agent
- Timestamp

Owner can view audit logs in **Admin → Audit Logs**.

---

## Security Notes

1. **API keys are hashed** using SHA-256 before storage. The full key is shown **only once** at creation.
2. **Partner API keys** are automatically scoped to their branch. They cannot access other branches' data.
3. **Owner API keys** have full access. Use with care.
4. Revoke compromised keys immediately from the API Keys page.
