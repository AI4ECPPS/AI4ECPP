/**
 * RAG (Retrieval Augmented Generation) API.
 * Per-user documents: all routes that read/write documents require auth and scope by user_id.
 */

import express from 'express'
import OpenAI from 'openai'
import { getPool } from '../db.js'
import { validateInput } from '../middleware/security.js'
import { authenticateToken } from './auth.js'
import { getChatModel } from '../config/openai.js'

const router = express.Router()
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIM = 1536
const CHUNK_SIZE = 600
const CHUNK_OVERLAP = 100
const DEFAULT_TOP_K = 5

let openai = null
const getOpenAI = () => {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key || key === 'your-openai-api-key-here') throw new Error('OPENAI_API_KEY not configured')
    openai = new OpenAI({ apiKey: key })
  }
  return openai
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  text = text.replace(/\r\n/g, '\n').trim()
  const paragraphs = text.split(/\n\n+/)
  let buffer = ''
  for (const p of paragraphs) {
    if (buffer.length + p.length + 1 <= chunkSize) {
      buffer = buffer ? buffer + '\n\n' + p : p
    } else {
      if (buffer) {
        chunks.push(buffer)
        const start = Math.max(0, buffer.length - overlap)
        buffer = buffer.slice(start) + '\n\n' + p
      } else {
        for (let i = 0; i < p.length; i += chunkSize - overlap) {
          chunks.push(p.slice(i, i + chunkSize))
        }
        buffer = ''
      }
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim())
  return chunks.filter(Boolean)
}

async function getEmbedding(text) {
  const res = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000)
  })
  return res.data[0].embedding
}

function embeddingToVectorStr(embedding) {
  return '[' + embedding.join(',') + ']'
}

/** POST /api/rag/documents - add a document to the current user's knowledge base */
router.post('/documents',
  authenticateToken,
  validateInput({
    checkProfanity: false,
    checkSQLInjection: false,
    checkXSS: false,
    maxLength: 500000,
    allowedFields: ['title', 'content']
  }),
  async (req, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const pool = getPool()
      if (!pool) {
        return res.status(503).json({
          error: 'RAG unavailable',
          message: 'Database (DATABASE_URL) is required for RAG. Set up PostgreSQL (e.g. Neon) and add DATABASE_URL.'
        })
      }
      const { title, content } = req.body
      if (!title || typeof title !== 'string' || !content || typeof content !== 'string') {
        return res.status(400).json({ error: 'title and content are required' })
      }
      const countResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM rag_documents WHERE user_id = $1',
        [userId]
      )
      const MAX_DOCUMENTS = 10
      if (countResult.rows[0].count >= MAX_DOCUMENTS) {
        return res.status(400).json({
          error: 'Maximum documents reached',
          message: `You can have at most ${MAX_DOCUMENTS} documents. Delete one to add another.`
        })
      }
      const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
      await pool.query(
        'INSERT INTO rag_documents (id, user_id, title) VALUES ($1, $2, $3)',
        [docId, userId, title.trim().slice(0, 500)]
      )
      const chunks = chunkText(content)
      if (chunks.length === 0) {
        await pool.query('DELETE FROM rag_documents WHERE id = $1', [docId])
        return res.status(400).json({ error: 'No content to index', message: 'Content is too short or empty.' })
      }
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i])
        const chunkId = docId + '_chunk_' + i
        await pool.query(
          `INSERT INTO rag_chunks (id, document_id, content, embedding) VALUES ($1, $2, $3, $4::vector)`,
          [chunkId, docId, chunks[i], embeddingToVectorStr(embedding)]
        )
      }
      res.status(201).json({
        message: 'Document added',
        documentId: docId,
        chunks: chunks.length
      })
    } catch (err) {
      console.error('[RAG] Add document error:', err)
      res.status(500).json({
        error: 'Failed to add document',
        message: err.message
      })
    }
  }
)

/** POST /api/rag/retrieve - get relevant context only (no GPT). Scoped to current user's documents. */
router.post('/retrieve',
  authenticateToken,
  validateInput({
    checkProfanity: true,
    filterProfanity: true,
    maxLength: 2000,
    allowedFields: ['question', 'topK']
  }),
  async (req, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const pool = getPool()
      if (!pool) {
        return res.status(503).json({
          error: 'RAG unavailable',
          message: 'Database (DATABASE_URL) is required for RAG.'
        })
      }
      const { question, topK = DEFAULT_TOP_K } = req.body
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'question is required' })
      }
      const k = Math.min(Math.max(1, parseInt(topK, 10) || DEFAULT_TOP_K), 20)
      const queryEmbedding = await getEmbedding(question.trim())
      const vectorStr = embeddingToVectorStr(queryEmbedding)
      const search = await pool.query(
        `SELECT c.id, c.document_id, c.content, d.title
         FROM rag_chunks c
         JOIN rag_documents d ON d.id = c.document_id AND d.user_id = $3
         ORDER BY c.embedding <=> $1::vector
         LIMIT $2`,
        [vectorStr, k, userId]
      )
      const context = search.rows.map(r => `[${r.title}]\n${r.content}`).join('\n\n---\n\n')
      res.json({
        context: context || '',
        chunks: search.rows.map(r => ({ title: r.title, excerpt: r.content.slice(0, 200) }))
      })
    } catch (err) {
      console.error('[RAG] Retrieve error:', err)
      res.status(500).json({
        error: 'RAG retrieve failed',
        message: err.message
      })
    }
  }
)

/** POST /api/rag/query - ask a question with RAG (retrieve + GPT). Scoped to current user's documents. */
router.post('/query',
  authenticateToken,
  validateInput({
    checkProfanity: true,
    filterProfanity: true,
    maxLength: 2000,
    allowedFields: ['question', 'topK', 'model']
  }),
  async (req, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const pool = getPool()
      if (!pool) {
        return res.status(503).json({
          error: 'RAG unavailable',
          message: 'Database (DATABASE_URL) is required for RAG.'
        })
      }
      const { question, topK = DEFAULT_TOP_K } = req.body
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'question is required' })
      }
      const k = Math.min(Math.max(1, parseInt(topK, 10) || DEFAULT_TOP_K), 20)
      const queryEmbedding = await getEmbedding(question.trim())
      const vectorStr = embeddingToVectorStr(queryEmbedding)
      const search = await pool.query(
        `SELECT c.id, c.document_id, c.content, d.title
         FROM rag_chunks c
         JOIN rag_documents d ON d.id = c.document_id AND d.user_id = $3
         ORDER BY c.embedding <=> $1::vector
         LIMIT $2`,
        [vectorStr, k, userId]
      )
      const context = search.rows.map(r => `[${r.title}]\n${r.content}`).join('\n\n---\n\n')
      const systemMessage = `You are a helpful assistant. Answer the user's question using ONLY the following context from the knowledge base. If the context does not contain relevant information, say so. Do not make up facts. Quote or refer to the context when possible.`
      const userMessage = context
        ? `Context from knowledge base:\n\n${context}\n\n---\n\nUser question: ${question.trim()}`
        : `No relevant documents in the knowledge base yet. User question: ${question.trim()}\n\nSuggest they add documents first.`
      const model = getChatModel(req)
      const completion = await getOpenAI().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
      const answer = completion.choices[0].message.content
      res.json({
        answer,
        sources: search.rows.length,
        chunksUsed: search.rows.map(r => ({ title: r.title, excerpt: r.content.slice(0, 150) + '...' }))
      })
    } catch (err) {
      console.error('[RAG] Query error:', err)
      res.status(500).json({
        error: 'RAG query failed',
        message: err.message
      })
    }
  }
)

/** GET /api/rag/documents - list current user's documents */
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const pool = getPool()
    if (!pool) {
      return res.status(503).json({ error: 'RAG unavailable', message: 'Database is required.' })
    }
    const r = await pool.query(
      'SELECT id, title, created_at FROM rag_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    res.json({ documents: r.rows })
  } catch (err) {
    console.error('[RAG] List documents error:', err)
    res.status(500).json({ error: 'Failed to list documents', message: err.message })
  }
})

/** GET /api/rag/documents/:id - get one document with full content (for viewing). Must belong to current user. */
router.get('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const pool = getPool()
    if (!pool) {
      return res.status(503).json({ error: 'RAG unavailable', message: 'Database is required.' })
    }
    const { id } = req.params
    const docRow = await pool.query(
      'SELECT id, title, created_at FROM rag_documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (docRow.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Document not found.' })
    }
    const chunks = await pool.query(
      'SELECT content FROM rag_chunks WHERE document_id = $1 ORDER BY id',
      [id]
    )
    const content = chunks.rows.map(r => r.content).join('\n\n')
    res.json({
      id: docRow.rows[0].id,
      title: docRow.rows[0].title,
      created_at: docRow.rows[0].created_at,
      content
    })
  } catch (err) {
    console.error('[RAG] Get document error:', err)
    res.status(500).json({ error: 'Failed to load document', message: err.message })
  }
})

/** DELETE /api/rag/documents/:id - delete a document (must belong to current user) */
router.delete('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const pool = getPool()
    if (!pool) {
      return res.status(503).json({ error: 'RAG unavailable', message: 'Database is required.' })
    }
    const { id } = req.params
    const r = await pool.query(
      'DELETE FROM rag_documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    )
    if (r.rowCount === 0) {
      console.warn('[RAG] Delete failed: no row matched id=', id, 'for user')
      return res.status(404).json({ error: 'Not found', message: 'Document not found or you do not have permission to delete it.' })
    }
    res.json({ message: 'Document deleted' })
  } catch (err) {
    console.error('[RAG] Delete document error:', err)
    res.status(500).json({ error: 'Failed to delete document', message: err.message })
  }
})

/** GET /api/rag/health - check if RAG is available */
router.get('/health', async (req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.json({ status: 'unavailable', message: 'DATABASE_URL not set' })
  }
  try {
    await pool.query('SELECT 1 FROM rag_documents LIMIT 1')
    res.json({ status: 'ok', message: 'RAG is ready' })
  } catch (e) {
    res.json({ status: 'error', message: e.message })
  }
})

export default router
