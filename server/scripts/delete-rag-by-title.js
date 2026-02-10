/**
 * One-off script: delete RAG document(s) by title.
 * Usage (from server/): node scripts/delete-rag-by-title.js "Educational Growth Memo"
 * Requires DATABASE_URL in server/.env
 */

import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = new URL('.', import.meta.url).pathname
dotenv.config({ path: `${__dirname}/../.env` })

const title = process.argv[2]
if (!title) {
  console.error('Usage: node scripts/delete-rag-by-title.js "Document title"')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const sql = 'DELETE FROM rag_documents WHERE title = $1 RETURNING id, title'
pool.query(sql, [title])
  .then(r => {
    console.log('Deleted', r.rowCount, 'document(s):', r.rows.length ? r.rows.map(x => x.title).join(', ') : '(none matched)')
    process.exit(0)
  })
  .catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
  })
  .finally(() => pool.end())
