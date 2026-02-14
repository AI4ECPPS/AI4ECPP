/**
 * Natural Language R/Stata Code Runner API.
 * - Default code library (JSON) + per-user snippets (DB)
 * - Generate code from natural language using library snippets
 */

import express from 'express'
import { getChatModel } from '../config/openai.js'
import OpenAI from 'openai'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { getPool } from '../db.js'
import { authenticateToken } from './auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()
const LIBRARY_PATH = path.join(__dirname, '..', 'data', 'code-library.json')

let defaultLibrary = null
function getDefaultLibrary() {
  if (defaultLibrary) return defaultLibrary
  try {
    const raw = fs.readFileSync(LIBRARY_PATH, 'utf8')
    defaultLibrary = JSON.parse(raw)
    return defaultLibrary
  } catch (e) {
    console.error('[NL Code Runner] Failed to load code-library.json:', e.message)
    return { R: {}, Stata: {} }
  }
}

let openai = null
const getOpenAI = () => {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key || key === 'your-openai-api-key-here') throw new Error('OPENAI_API_KEY not configured')
    openai = new OpenAI({ apiKey: key })
  }
  return openai
}

/** GET /api/nl-code-runner/library — default library (and user snippets if authenticated) */
router.get('/library', async (req, res) => {
  try {
    const lib = getDefaultLibrary()
    const response = { default: lib, user: [] }
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token) {
      try {
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
        const pool = getPool()
        if (pool && decoded.userId) {
          const r = await pool.query(
            'SELECT id, name, language, description, snippet, created_at AS "createdAt" FROM user_code_snippets WHERE user_id = $1 ORDER BY created_at DESC',
            [decoded.userId]
          )
          response.user = r.rows
        }
      } catch (_) {
        // ignore invalid token
      }
    }
    res.json(response)
  } catch (err) {
    console.error('[NL Code Runner] library error:', err)
    res.status(500).json({ error: 'Failed to load library', message: err.message })
  }
})

/** GET /api/nl-code-runner/snippets — list current user's snippets (auth required) */
router.get('/snippets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const pool = getPool()
    if (!pool) {
      return res.json([])
    }
    const r = await pool.query(
      'SELECT id, name, language, description, snippet, created_at AS "createdAt" FROM user_code_snippets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    res.json(r.rows)
  } catch (err) {
    console.error('[NL Code Runner] snippets list error:', err)
    res.status(500).json({ error: 'Failed to list snippets', message: err.message })
  }
})

/** POST /api/nl-code-runner/snippets — add user snippet (auth required) */
router.post('/snippets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { name, language, description, snippet } = req.body
    if (!name || !language || !snippet) {
      return res.status(400).json({ error: 'Missing name, language, or snippet' })
    }
    if (!['R', 'Stata'].includes(language)) {
      return res.status(400).json({ error: 'language must be R or Stata' })
    }
    const pool = getPool()
    if (!pool) {
      return res.status(503).json({ error: 'Database not available; user snippets disabled' })
    }
    const id = `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    await pool.query(
      'INSERT INTO user_code_snippets (id, user_id, name, language, description, snippet) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, String(name).slice(0, 200), language, description ? String(description).slice(0, 500) : null, String(snippet)]
    )
    const r = await pool.query(
      'SELECT id, name, language, description, snippet, created_at AS "createdAt" FROM user_code_snippets WHERE id = $1',
      [id]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    console.error('[NL Code Runner] add snippet error:', err)
    res.status(500).json({ error: 'Failed to add snippet', message: err.message })
  }
})

/** DELETE /api/nl-code-runner/snippets/:id — delete user snippet (auth required) */
router.delete('/snippets/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params
    const pool = getPool()
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' })
    }
    const r = await pool.query('DELETE FROM user_code_snippets WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Snippet not found or not owned by you' })
    }
    res.json({ success: true, deleted: id })
  } catch (err) {
    console.error('[NL Code Runner] delete snippet error:', err)
    res.status(500).json({ error: 'Failed to delete snippet', message: err.message })
  }
})

/** POST /api/nl-code-runner/generate — generate code from natural language */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, language, codeLibraryKeys = [], userSnippetIds = [], selectedVariables = {}, fileNames = [] } = req.body
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' })
    }
    const lang = language === 'Stata' ? 'Stata' : 'R'
    const lib = getDefaultLibrary()
    const langLib = lib[lang] || {}

    // Build context: default snippets + optional user snippets
    let snippetsContext = ''
    for (const key of codeLibraryKeys) {
      if (langLib[key]) {
        snippetsContext += `[Snippet: ${langLib[key].name}]\n${langLib[key].snippet}\n\n`
      }
    }

    // User snippets (by id) — need to load from DB if any; for now we don't have auth in generate, so we could pass snippet text in body or require auth
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token && userSnippetIds.length > 0) {
      try {
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
        const pool = getPool()
        if (pool) {
          for (const id of userSnippetIds) {
            const r = await pool.query('SELECT name, snippet FROM user_code_snippets WHERE id = $1 AND user_id = $2', [id, decoded.userId])
            if (r.rows[0]) {
              snippetsContext += `[User snippet: ${r.rows[0].name}]\n${r.rows[0].snippet}\n\n`
            }
          }
        }
      } catch (_) {}
    }

    const varsStr = JSON.stringify(selectedVariables, null, 2)
    const filesStr = Array.isArray(fileNames) ? fileNames.join(', ') : String(fileNames)

    const systemMessage = `You are an expert in ${lang} for empirical economics and data analysis. Generate runnable ${lang} code only, no markdown or explanation outside comments.

${snippetsContext ? `Use or adapt these snippets when relevant:\n${snippetsContext}` : ''}

Selected variables (use these exact names in code): ${varsStr}
Data file(s): ${filesStr || 'user will load data'}

Rules: Output only ${lang} code. Use the variable names and file names above. No markdown code fences. Comments are fine.`

    const model = getChatModel(req)
    const client = getOpenAI()
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt.trim() }
      ],
      temperature: 0.2,
      max_completion_tokens: 2000
    })
    let code = (completion.choices[0].message.content || '').trim()
    code = code.replace(/^```(?:r|R|stata)?\s*/i, '').replace(/\s*```$/i, '').trim()
    res.json({ success: true, code })
  } catch (err) {
    console.error('[NL Code Runner] generate error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to generate code',
      message: err.message
    })
  }
})

export default router
