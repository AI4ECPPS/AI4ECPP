import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { initDb } from './db.js'
import authRoutes from './routes/auth.js'
import chatgptRoutes from './routes/chatgpt.js'
import policyAnalystRoutes from './routes/policy-analyst.js'
import policyDLAgentRoutes from './routes/policy-dl-agent.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:1307',
  credentials: true
}))
app.use(express.json({ limit: '50mb' })) // Increase limit for large CSV files
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api', chatgptRoutes)
app.use('/api/policy-analyst', policyAnalystRoutes)
app.use('/api/policy-dl-agent', policyDLAgentRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Debug: Log all registered routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', (req, res, next) => {
    console.log(`[DEBUG] Request to: ${req.method} ${req.path}`)
    next()
  })
}

// Serve frontend in production (Railway deployment)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  // SPA fallback - client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server (init DB first when DATABASE_URL is set)
async function start() {
  if (process.env.DATABASE_URL) {
    const ok = await initDb()
    if (ok) console.log('📦 Database connected (users will persist)')
    else console.warn('⚠️ Database init failed; using in-memory user storage')
  }
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📝 Make sure to set OPENAI_API_KEY in your .env file`)
  })
}
start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})

