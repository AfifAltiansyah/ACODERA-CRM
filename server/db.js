import { createPool } from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import WebSocket from 'ws'

dotenv.config()

// ─── Supabase client (for builder-style queries, storage, auth) ───────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY not set in .env.\n' +
    'Add it from Supabase Dashboard → Settings → API → service_role key.\n' +
    'Using anon key as fallback (will fail for RLS-restricted operations).'
  )
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
    db: { schema: 'public' },
  }
)

export { supabase }

// ─── MySQL connection pool (for SQL-string queries with prepared stmts) ─
let pool = null

function getPool() {
  if (pool) return pool
  pool = createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'acodera_crm',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  })
  return pool
}

// ─── query() — dual API ───────────────────────────────────────────────
//
// Builder style (preferred):
//   query('users', q => q.select('*').eq('email', email))
//
// SQL-string style (legacy, uses mysql2 prepared statements):
//   query('SELECT * FROM users WHERE email = ?', [email])

export async function query(tableOrSql, paramsOrCallback) {
  // Builder style: query('table', q => q.select(...))
  if (typeof tableOrSql === 'string' && typeof paramsOrCallback === 'function') {
    const builder = supabase.from(tableOrSql)
    const promise = paramsOrCallback(builder)
    if (promise && typeof promise.then === 'function') {
      const result = await promise
      if (result.error) throw result.error
      return result.data || []
    }
    return promise
  }

  // SQL-string style: query('SELECT ... WHERE ?', [val])
  if (typeof tableOrSql === 'string') {
    const sql = tableOrSql
    const params = Array.isArray(paramsOrCallback) ? paramsOrCallback : []

    try {
      const conn = getPool()
      const [rows] = await conn.execute(sql, params)
      // MySQL returns [RowDataPacket[], FieldPacket[]] from execute
      // Normalize the result: provide insertId and array-like access
      if (Array.isArray(rows)) {
        const result = rows
        if (result.insertId !== undefined) {
          result.insertId = result.insertId
        }
        return result
      }
      return rows
    } catch (err) {
      console.error('[db] MySQL query error:', err.message)
      throw err
    }
  }

  throw new Error(
    'query() usage:\n' +
    '  query("table", q => q.select("*").eq("col", val))  // builder\n' +
    '  query("SELECT * FROM table WHERE col = ?", [val])   // SQL string'
  )
}

// For backward compatibility with routes that import pool directly
export default supabase
