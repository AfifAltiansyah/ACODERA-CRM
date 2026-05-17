import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import WebSocket from 'ws'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.warn(
    'SUPABASE_SERVICE_KEY not set in .env.\n' +
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

// Drop-in replacement for the old MySQL `query()` function.
// Accepts a table name and a callback that receives a Supabase query builder.
// Also supports raw SQL strings for backward compatibility.
export function query(tableOrSql, paramsOrCallback) {
  // Old style: query('SELECT * FROM users WHERE email = ?', ['a@b.com'])
  if (typeof tableOrSql === 'string') {
    const sql = tableOrSql
    const params = Array.isArray(paramsOrCallback) ? paramsOrCallback : []

    // Parse table name
    const tableMatch = sql.match(/\bFROM\s+(\w+)/i) || sql.match(/\bINTO\s+(\w+)/i) || sql.match(/\bUPDATE\s+(\w+)/i)
    if (!tableMatch) throw new Error('Cannot parse table: ' + sql)
    const table = tableMatch[1]

    // INSERT INTO ... VALUES
    const insertMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i)
    if (insertMatch) {
      const cols = insertMatch[1].split(',').map(c => c.trim())
      const row = {}
      cols.forEach((col, i) => { row[col] = params[i] })
      return supabase.from(table).insert(row).select().then(r => {
        if (r.error) throw r.error
        // MySQL compatibility: provide insertId-like behavior
        const result = r.data || []
        result.insertId = result[0]?.id
        return result
      })
    }

    // DELETE FROM ... WHERE ...
    const deleteMatch = sql.match(/DELETE\s+FROM\s+\w+(?:\s+WHERE\s+(.+))?/i)
    if (deleteMatch) {
      let q = supabase.from(table).delete()
      if (deleteMatch[1]) {
        const w = deleteMatch[1].match(/(\w+)\s*=\s*\?/i)
        if (w) {
          q = q.eq(w[1], params[0])
          // Handle AND clauses
          const ands = deleteMatch[1].split(/\s+AND\s+/i).slice(1)
          ands.forEach((c, i) => {
            const m = c.match(/(\w+)\s*=\s*\?/i)
            if (m) q = q.eq(m[1], params[i + 1])
          })
        }
      }
      return q.then(r => {
        if (r.error) throw r.error
        return r.data || []
      })
    }

    // UPDATE ... SET ... WHERE ...
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i)
    if (updateMatch) {
      const setClause = updateMatch[2]
      const whereClause = updateMatch[3]
      const pairs = setClause.split(/\s*,\s*/)
      const updateObj = {}
      let paramIdx = 0
      for (const pair of pairs) {
        const m = pair.trim().match(/(\w+)\s*=\s*(.+)/i)
        if (!m) continue
        const col = m[1]
        const expr = m[2].trim()
        if (expr === '?') {
          updateObj[col] = params[paramIdx++]
        } else if (/^NULL$/i.test(expr)) {
          updateObj[col] = null
        } else if (/^NOW\(\)$/i.test(expr)) {
          updateObj[col] = new Date().toISOString()
        } else if (/^'.*'$/.test(expr)) {
          updateObj[col] = expr.replace(/^'(.*)'$/, '$1')
        }
      }
      let q = supabase.from(table).update(updateObj)
      if (whereClause) {
        const conditions = whereClause.split(/\s+AND\s+/i)
        for (const cond of conditions) {
          const wm = cond.trim().match(/(\w+)\s*(=|!=|<|>|LIKE|IN)\s*\?/i)
          if (wm) {
            const val = params[paramIdx++]
            switch (wm[2].toUpperCase()) {
              case '=': q = q.eq(wm[1], val); break
              case '!=': q = q.neq(wm[1], val); break
              case '>': q = q.gt(wm[1], val); break
              case '<': q = q.lt(wm[1], val); break
            }
          }
        }
      }
      return q.then(r => {
        if (r.error) throw r.error
        return r.data || []
      })
    }

    // Parse: SELECT ... WHERE col = ? [ORDER BY col DESC]
    // This handles the simple query patterns used in our routes
    let q = supabase.from(table).select('*')
    let paramIdx = 0

    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|$)/i)
    if (whereMatch) {
      const conditions = whereMatch[1].split(/\s+AND\s+/i)
      for (const cond of conditions) {
        const m = cond.match(/(\w+)\s*(=|!=|<|>|LIKE|IN)\s*\?/i)
        if (m) {
          const val = params[paramIdx++]
          const col = m[1]
          switch (m[2].toUpperCase()) {
            case '=': q = q.eq(col, val); break
            case '!=': q = q.neq(col, val); break
            case '>': q = q.gt(col, val); break
            case '<': q = q.lt(col, val); break
          }
        }
      }
    }

    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i)
    if (orderMatch) {
      q = q.order(orderMatch[1], { ascending: orderMatch[2]?.toUpperCase() !== 'DESC' })
    }

    const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) q = q.limit(parseInt(limitMatch[1]))

    return q.then(r => {
      if (r.error) throw r.error
      return r.data || []
    })
  }

  // New style: query('users', q => q.select('*').eq('email', email))
  // This is the preferred way going forward
  const builder = supabase.from(tableOrSql)
  const promise = paramsOrCallback(builder)
  if (promise && typeof promise.then === 'function') return promise
  return promise
}

// For backward compatibility with routes that import pool directly
export default supabase