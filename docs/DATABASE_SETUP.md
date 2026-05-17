# Acodera CRM — Database Integration Guide

## Architecture

```
React Frontend (port 5173) ←→ Express API (port 3001) ←→ MySQL (port 3306)
```

---

## Step 1: Set Up MySQL Database

### Option A: Using phpMyAdmin

1. Open phpMyAdmin (usually `http://localhost/phpmyadmin`)
2. Click the **SQL** tab
3. Copy the entire contents of `server/sql/init.sql`
4. Paste and click **Go**

This will:
- Create database `acodera_crm`
- Create 5 tables: `users`, `contacts`, `automations`, `flows`, `reviews`
- Seed the admin user and sample data

### Option B: Using MySQL CLI

```bash
mysql -u root -p < server/sql/init.sql
```

---

## Step 2: Configure Database Credentials

Edit `server/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password    # ← Change this
DB_NAME=acodera_crm
PORT=3001
JWT_SECRET=acodera-secret-key-change-in-production-2026
```

---

## Step 3: Start the Backend Server

```bash
cd server
npm install
npm start
```

You should see:
```
Server running on http://localhost:3001
API available at http://localhost:3001/api
```

Test it: `curl http://localhost:3001/api/health`

---

## Step 4: Start the Frontend

```bash
npm run dev
```

The frontend (port 5173) will proxy `/api` requests to the backend (port 3001).

---

## Step 5: Log In

- **Email:** `acoderaAdmin@gmail.com`
- **Password:** `education123`

---

## How It Works

### Without Backend (Fallback)
If the backend is not running, the frontend automatically falls back to `localStorage`. All CRUD operations still work but data is only stored in the browser.

### With Backend (Production)
All data is stored in MySQL. The frontend calls the API, and the API talks to the database.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/contacts` | Get all contacts |
| POST | `/api/contacts` | Create contact |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| GET | `/api/automations` | Get all automations |
| POST | `/api/automations` | Create automation |
| PUT | `/api/automations/:id/toggle` | Toggle active/pause |
| DELETE | `/api/automations/:id` | Delete automation |
| GET | `/api/flows` | Get all flows |
| POST | `/api/flows` | Create flow |
| PUT | `/api/flows/:id` | Update flow (move stage) |
| DELETE | `/api/flows/:id` | Delete flow |
| GET | `/api/reviews` | Get all reviews |
| POST | `/api/reviews` | Create review |
| PUT | `/api/reviews/:id/reply` | Reply to review |
| DELETE | `/api/reviews/:id` | Delete review |

---

## File Structure

```
crm-login/
├── src/                          # React frontend
│   ├── api/                      # API client layer
│   │   ├── client.js             # Base fetch with auth
│   │   ├── auth.js
│   │   ├── contacts.js
│   │   ├── automations.js
│   │   ├── flows.js
│   │   └── reviews.js
│   ├── utils/
│   │   ├── auth.jsx              # Auth with API + fallback
│   │   └── mockData.js           # CRUD with API + fallback
│   └── ...
│
├── server/                       # Express backend
│   ├── index.js                  # Express app
│   ├── db.js                     # MySQL connection pool
│   ├── .env                      # Database credentials
│   ├── package.json
│   ├── routes/
│   │   ├── auth.js
│   │   ├── contacts.js
│   │   ├── automations.js
│   │   ├── flows.js
│   │   └── reviews.js
│   └── sql/
│       └── init.sql              # Run in phpMyAdmin
│
└── vite.config.js                # Proxy /api → backend
```

---

## Quick Start Commands

```bash
# Terminal 1 — Backend
cd server && npm start

# Terminal 2 — Frontend
npm run dev
```
