/**
 * 后端安全中间件
 * 提供输入验证、清理和过滤功能
 */

// 常见脏话列表（与前端保持一致）
const PROFANITY_WORDS = [
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap',
  'piss', 'hell', 'dick', 'cock', 'pussy', 'whore', 'slut',
  // 中文脏话
  '操', '日', '妈的', '傻逼', '草', '靠', '滚'
]

// SQL注入常见模式
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(--|#|\/\*|\*\/|;|'|"|`)/g,
  /(\bOR\b.*=.*=)/gi,
  /(\bAND\b.*=.*=)/gi,
  /(\bUNION\b.*\bSELECT\b)/gi
]

// XSS攻击常见模式
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]*src[^>]*=.*javascript:/gi,
  /<svg[^>]*onload/gi
]

/**
 * 检查是否包含脏话
 */
const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') return false
  const lowerText = text.toLowerCase()
  return PROFANITY_WORDS.some(word => lowerText.includes(word.toLowerCase()))
}

/**
 * 检查是否包含SQL注入模式
 */
const containsSQLInjection = (text) => {
  if (!text || typeof text !== 'string') return false
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * 检查是否包含XSS攻击模式
 */
const containsXSS = (text) => {
  if (!text || typeof text !== 'string') return false
  return XSS_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * 清理输入
 */
const sanitizeInput = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  // 移除HTML标签
  let cleaned = text.replace(/<[^>]*>/g, '')
  
  // 移除危险字符
  cleaned = cleaned.replace(/[<>]/g, '')
  
  // 移除控制字符
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  return cleaned.trim()
}

/**
 * 验证邮箱格式
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * 递归清理对象中的所有字符串值
 */
const sanitizeObject = (obj, options = {}) => {
  const {
    filterProfanity: shouldFilterProfanity = false,
    maxLength = 10000,
    allowHTML = false
  } = options

  if (typeof obj === 'string') {
    let cleaned = sanitizeInput(obj)
    
    // 限制长度
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength)
    }
    
    // 过滤脏话
    if (shouldFilterProfanity && containsProfanity(cleaned)) {
      PROFANITY_WORDS.forEach(word => {
        const regex = new RegExp(word, 'gi')
        cleaned = cleaned.replace(regex, '*'.repeat(word.length))
      })
    }
    
    return cleaned
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], options)
      }
    }
    return sanitized
  }

  return obj
}

/**
 * 输入验证中间件
 */
export const validateInput = (options = {}) => {
  const {
    checkProfanity = true,
    checkSQLInjection = true,
    checkXSS = true,
    maxLength = 10000,
    filterProfanity = false,
    allowedFields = null // 如果指定，只验证这些字段
  } = options

  return (req, res, next) => {
    try {
      // 验证请求体
      if (req.body && typeof req.body === 'object') {
        const fieldsToCheck = allowedFields || Object.keys(req.body)
        
        for (const field of fieldsToCheck) {
          const value = req.body[field]
          
          if (value && typeof value === 'string') {
            // 检查长度
            if (value.length > maxLength) {
              return res.status(400).json({
                error: 'Input too long',
                message: `Field "${field}" exceeds maximum length of ${maxLength} characters`
              })
            }
            
            // 检查SQL注入（跳过密码相关字段）
            // 注意：密码字段不进行SQL注入检测是安全的，因为：
            // 1. 密码会被bcrypt哈希存储，不会以明文形式进入数据库
            // 2. 密码比较使用bcrypt.compare()，不会直接参与SQL查询
            // 3. 如果使用数据库，必须使用参数化查询（prepared statements）
            // 4. 密码可能包含特殊字符（#、;、'、"等），这些是合法的密码字符
            if (checkSQLInjection && 
                field !== 'password' && 
                field !== 'currentPassword' && 
                field !== 'newPassword' &&
                containsSQLInjection(value)) {
              console.warn(`Potential SQL injection detected in field "${field}"`)
              return res.status(400).json({
                error: 'Invalid input',
                message: 'Input contains potentially dangerous content'
              })
            }
            
            // 检查XSS（跳过密码相关字段）
            if (checkXSS && 
                field !== 'password' && 
                field !== 'currentPassword' && 
                field !== 'newPassword' &&
                containsXSS(value)) {
              console.warn(`Potential XSS detected in field "${field}"`)
              return res.status(400).json({
                error: 'Invalid input',
                message: 'Input contains potentially dangerous content'
              })
            }
            
            // 检查脏话（除了密码字段）
            if (checkProfanity && 
                field !== 'password' && 
                field !== 'currentPassword' && 
                field !== 'newPassword' &&
                containsProfanity(value)) {
              if (filterProfanity) {
                // 过滤脏话
                let filtered = value
                PROFANITY_WORDS.forEach(word => {
                  const regex = new RegExp(word, 'gi')
                  filtered = filtered.replace(regex, '*'.repeat(word.length))
                })
                req.body[field] = filtered
              } else {
                return res.status(400).json({
                  error: 'Invalid input',
                  message: 'Please use appropriate language'
                })
              }
            }
            
            // 清理输入（除了密码字段和 ChatGPT prompt 字段，这些需要保持原样）
            // 密码需要保持原样用于哈希
            // ChatGPT prompt 和 systemMessage 需要保持原样，因为会被发送到 OpenAI API
            if (field !== 'password' && 
                field !== 'currentPassword' && 
                field !== 'newPassword' &&
                field !== 'prompt' &&
                field !== 'systemMessage') {
              req.body[field] = sanitizeInput(value)
            }
          }
        }
      }
      
      // 验证查询参数
      if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
          if (req.query.hasOwnProperty(key)) {
            const value = req.query[key]
            if (value && typeof value === 'string') {
              if (checkSQLInjection && containsSQLInjection(value)) {
                return res.status(400).json({
                  error: 'Invalid input',
                  message: 'Query parameter contains potentially dangerous content'
                })
              }
              if (checkXSS && containsXSS(value)) {
                return res.status(400).json({
                  error: 'Invalid input',
                  message: 'Query parameter contains potentially dangerous content'
                })
              }
              req.query[key] = sanitizeInput(value)
            }
          }
        }
      }
      
      next()
    } catch (error) {
      console.error('Input validation error:', error)
      return res.status(500).json({
        error: 'Input validation failed',
        message: 'An error occurred while validating input'
      })
    }
  }
}

/**
 * 验证邮箱格式的中间件
 */
export const validateEmailFormat = (req, res, next) => {
  if (req.body && req.body.email) {
    if (!validateEmail(req.body.email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      })
    }
  }
  next()
}

/**
 * 验证密码的中间件
 * 密码规则：
 * - 至少6个字符，最多128个字符
 * - 可以包含字母、数字和任何特殊字符（包括 #, ;, ', ", ` 等）
 * - 不允许控制字符（不可打印字符）
 */
export const validatePasswordFormat = (req, res, next) => {
  if (req.body && req.body.password) {
    const password = req.body.password
    
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 6 characters'
      })
    }
    
    if (password.length > 128) {
      return res.status(400).json({
        error: 'Password too long',
        message: 'Password must be less than 128 characters'
      })
    }
    
    // 检查是否包含控制字符（不可打印字符，除了空格）
    // 这些字符可能会导致问题，不应该在密码中使用
    const controlCharRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/
    if (controlCharRegex.test(password)) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password contains invalid control characters'
      })
    }
    
    // 注意：密码字段不进行SQL注入和XSS检测
    // 原因：
    // 1. 密码会被bcrypt哈希存储，不会以明文形式进入数据库或SQL查询
    // 2. 密码比较使用bcrypt.compare()，不会直接参与字符串比较或SQL查询
    // 3. 密码可以包含各种特殊字符（如 #, ;, ', ", ` 等），这些都是合法的密码字符
    // 4. 如果将来迁移到数据库，必须使用参数化查询（prepared statements）来防止SQL注入
  }
  next()
}

/**
 * 速率限制辅助函数（简单实现，生产环境建议使用express-rate-limit）
 */
export const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map()
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress
    const now = Date.now()
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + windowMs })
      return next()
    }
    
    const record = requests.get(ip)
    
    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
      return next()
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later'
      })
    }
    
    record.count++
    next()
  }
}

export default {
  validateInput,
  validateEmailFormat,
  validatePasswordFormat,
  createRateLimiter
}

