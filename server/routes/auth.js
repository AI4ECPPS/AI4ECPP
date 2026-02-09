import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validateInput, validateEmailFormat, validatePasswordFormat } from '../middleware/security.js'
import { getPool } from '../db.js'

const router = express.Router()

// In-memory fallback when DATABASE_URL is not set (e.g. local dev)
const users = []

async function findUserByEmail(email) {
  const pool = getPool()
  if (pool) {
    const r = await pool.query('SELECT id, email, password, created_at AS "createdAt" FROM users WHERE email = $1', [email])
    return r.rows[0] || null
  }
  return users.find(u => u.email === email) || null
}

async function findUserById(id) {
  const pool = getPool()
  if (pool) {
    const r = await pool.query('SELECT id, email, password, created_at AS "createdAt" FROM users WHERE id = $1', [id])
    return r.rows[0] || null
  }
  return users.find(u => u.id === id) || null
}

async function createUser(user) {
  const pool = getPool()
  if (pool) {
    await pool.query(
      'INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.email, user.password, user.createdAt]
    )
    return
  }
  users.push(user)
}

async function updateUserPassword(id, hashedPassword) {
  const pool = getPool()
  if (pool) {
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id])
    return
  }
  const user = users.find(u => u.id === id)
  if (user) user.password = hashedPassword
}

// JWT验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = decoded
    next()
  })
}

// Sign up
router.post('/signup', 
  validateInput({ checkProfanity: true, filterProfanity: false, maxLength: 500 }),
  validateEmailFormat,
  validatePasswordFormat,
  async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Normalize email to lowercase for consistent storage and lookup
    const normalizedEmail = email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await findUserByEmail(normalizedEmail)
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = {
      id: Date.now().toString(),
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date()
    }

    await createUser(user)

    // Debug: Log user creation (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] User created: ${normalizedEmail}`)
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login
router.post('/login',
  validateInput({ checkProfanity: false, maxLength: 500 }), // 登录时不需要检查脏话
  validateEmailFormat,
  validatePasswordFormat,
  async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.trim().toLowerCase()

    // Find user
    const user = await findUserByEmail(normalizedEmail)
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] User not found: ${normalizedEmail}`)
      }
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Password mismatch for user: ${normalizedEmail}`)
      }
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Change password
router.put('/change-password',
  authenticateToken,
  validateInput({ checkProfanity: false, maxLength: 500 }),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.userId

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' })
      }

      // Validate new password format
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'New password must be at least 6 characters'
        })
      }
      
      if (newPassword.length > 128) {
        return res.status(400).json({
          error: 'Password too long',
          message: 'New password must be less than 128 characters'
        })
      }

      // Find user
      const user = await findUserById(userId)
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid current password' })
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password)
      if (isSamePassword) {
        return res.status(400).json({ error: 'New password must be different from current password' })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await updateUserPassword(userId, hashedPassword)

      res.json({
        message: 'Password changed successfully'
      })
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router

