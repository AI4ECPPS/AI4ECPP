/**
 * PostgreSQL database connection and init.
 * Set DATABASE_URL in environment to enable persistent user storage.
 */

import pg from 'pg'

const { Pool } = pg

let pool = null

export function getPool() {
  if (!process.env.DATABASE_URL) return null
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  }
  return pool
}

export async function initDb() {
  const p = getPool()
  if (!p) return false
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    return true
  } catch (err) {
    console.error('[DB] Init failed:', err.message)
    return false
  }
}
