/**
 * 前端安全工具模块
 * 提供输入验证、清理和过滤功能
 */

// 常见脏话列表（可以根据需要扩展）
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
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /<img[^>]*src[^>]*=.*javascript:/gi,
  /<svg[^>]*onload/gi
]

/**
 * 检查是否包含脏话
 */
export const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') return false
  
  const lowerText = text.toLowerCase()
  return PROFANITY_WORDS.some(word => lowerText.includes(word.toLowerCase()))
}

/**
 * 检查是否包含SQL注入模式
 */
export const containsSQLInjection = (text) => {
  if (!text || typeof text !== 'string') return false
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * 检查是否包含XSS攻击模式
 */
export const containsXSS = (text) => {
  if (!text || typeof text !== 'string') return false
  
  return XSS_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * 清理HTML标签和危险字符
 */
export const sanitizeInput = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  // 移除HTML标签
  let cleaned = text.replace(/<[^>]*>/g, '')
  
  // 移除危险字符
  cleaned = cleaned.replace(/[<>]/g, '')
  
  // 移除控制字符（保留换行符和制表符）
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  return cleaned.trim()
}

/**
 * 过滤脏话（替换为*）
 */
export const filterProfanity = (text) => {
  if (!text || typeof text !== 'string') return text
  
  let filtered = text
  PROFANITY_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi')
    filtered = filtered.replace(regex, '*'.repeat(word.length))
  })
  
  return filtered
}

/**
 * 验证邮箱格式
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * 验证密码强度
 * 密码规则：
 * - 至少6个字符，最多128个字符
 * - 可以包含字母、数字和任何特殊字符（包括 #, ;, ', ", ` 等）
 * - 密码会被bcrypt哈希存储，不会直接进入数据库查询，所以允许所有字符
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' }
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long (max 128 characters)' }
  }
  
  // 检查是否包含控制字符（不可打印字符，除了空格）
  // 这些字符可能会导致问题，不应该在密码中使用
  const controlCharRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/
  if (controlCharRegex.test(password)) {
    return { valid: false, message: 'Password contains invalid control characters' }
  }
  
  // 注意：密码字段不进行SQL注入和XSS检测
  // 原因：
  // 1. 密码会被bcrypt哈希存储，不会以明文形式进入数据库或SQL查询
  // 2. 密码比较使用bcrypt.compare()，不会直接参与字符串比较或SQL查询
  // 3. 密码可以包含各种特殊字符（如 #, ;, ', ", ` 等），这些都是合法的密码字符
  // 4. 如果将来迁移到数据库，必须使用参数化查询（prepared statements）来防止SQL注入
  
  return { valid: true, message: 'Password is valid' }
}

/**
 * 获取密码要求说明
 */
export const getPasswordRequirements = () => {
  return {
    minLength: 6,
    maxLength: 128,
    description: 'Password must be 6-128 characters. Can include letters, numbers, and special characters (e.g., #, @, !, $, etc.).'
  }
}

/**
 * 验证和清理文本输入
 */
export const validateAndSanitizeText = (text, options = {}) => {
  const {
    maxLength = 10000,
    minLength = 0,
    allowHTML = false,
    filterProfanity: shouldFilterProfanity = false,
    required = false,
    checkSQLInjection = true, // 新增选项：是否检查SQL注入
    checkXSS = true // 新增选项：是否检查XSS
  } = options
  
  // 检查是否为空
  if (required && (!text || text.trim().length === 0)) {
    return {
      valid: false,
      message: 'This field is required',
      cleaned: ''
    }
  }
  
  if (!text) {
    return { valid: true, message: '', cleaned: '' }
  }
  
  // 检查长度
  if (text.length > maxLength) {
    return {
      valid: false,
      message: `Text is too long (max ${maxLength} characters)`,
      cleaned: text.substring(0, maxLength)
    }
  }
  
  if (text.length < minLength) {
    return {
      valid: false,
      message: `Text is too short (min ${minLength} characters)`,
      cleaned: text
    }
  }
  
  // 检查SQL注入（如果启用）
  if (checkSQLInjection && containsSQLInjection(text)) {
    return {
      valid: false,
      message: 'Input contains potentially dangerous content',
      cleaned: sanitizeInput(text)
    }
  }
  
  // 检查XSS（如果启用）
  if (checkXSS && containsXSS(text)) {
    return {
      valid: false,
      message: 'Input contains potentially dangerous content',
      cleaned: sanitizeInput(text)
    }
  }
  
  // 检查脏话
  if (containsProfanity(text)) {
    if (shouldFilterProfanity) {
      return {
        valid: true,
        message: 'Profanity filtered',
        cleaned: filterProfanity(text)
      }
    } else {
      return {
        valid: false,
        message: 'Please use appropriate language',
        cleaned: text
      }
    }
  }
  
  // 清理输入
  let cleaned = allowHTML ? text : sanitizeInput(text)
  
  return {
    valid: true,
    message: '',
    cleaned
  }
}

/**
 * 验证文件名（用于文件上传）
 */
export const validateFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, message: 'Invalid file name' }
  }
  
  // 检查危险字符
  const dangerousChars = /[<>:"|?*\x00-\x1F]/
  if (dangerousChars.test(fileName)) {
    return { valid: false, message: 'File name contains invalid characters' }
  }
  
  // 检查路径遍历
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, message: 'Invalid file name' }
  }
  
  // 检查长度
  if (fileName.length > 255) {
    return { valid: false, message: 'File name is too long' }
  }
  
  return { valid: true, message: '' }
}

/**
 * 限制输入长度（实时验证）
 */
export const limitInputLength = (text, maxLength) => {
  if (!text || typeof text !== 'string') return ''
  return text.substring(0, maxLength)
}

