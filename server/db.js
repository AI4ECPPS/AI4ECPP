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
    await initRagDb()
    await initCodeSnippetsDb()
    return true
  } catch (err) {
    console.error('[DB] Init failed:', err.message)
    return false
  }
}

/** NL Code Runner: per-user code snippets for R/Stata library */
export async function initCodeSnippetsDb() {
  const p = getPool()
  if (!p) return false
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS user_code_snippets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        language TEXT NOT NULL CHECK (language IN ('R', 'Stata')),
        description TEXT,
        snippet TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    await p.query(`CREATE INDEX IF NOT EXISTS user_code_snippets_user_id ON user_code_snippets(user_id)`).catch(() => {})
    return true
  } catch (err) {
    console.error('[DB] Code snippets init failed:', err.message)
    return false
  }
}

/** RAG: enable pgvector and create documents/chunks tables (per-user) */
export async function initRagDb() {
  const p = getPool()
  if (!p) return false
  try {
    await p.query('CREATE EXTENSION IF NOT EXISTS vector')
    await p.query(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    await p.query(`
      ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS user_id TEXT
    `).catch(() => {})
    await p.query(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    await p.query(`
      CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx ON rag_chunks
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `).catch(() => {}) /* ignore if exists or unsupported */
    return true
  } catch (err) {
    console.error('[DB] RAG init failed:', err.message)
    return false
  }
}
