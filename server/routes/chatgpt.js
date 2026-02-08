import express from 'express'
import OpenAI from 'openai'
import { validateInput } from '../middleware/security.js'

const router = express.Router()

// Initialize OpenAI client (lazy initialization)
let openai = null

const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openai = new OpenAI({
      apiKey: apiKey
    })
  }
  return openai
}

// Middleware to check if OpenAI API key is configured
const checkOpenAIKey = (req, res, next) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: 'Please set OPENAI_API_KEY in your .env file'
    })
  }
  next()
}

// ChatGPT API endpoint
router.post('/chatgpt', 
  checkOpenAIKey,
  validateInput({ 
    checkProfanity: true, 
    filterProfanity: true, // 过滤脏话而不是拒绝
    checkSQLInjection: false, // ChatGPT prompt 不需要检查 SQL 注入，因为不会直接进入数据库
    checkXSS: false, // ChatGPT prompt 不需要检查 XSS，因为会被发送到 OpenAI API
    maxLength: 50000, // ChatGPT prompt 可以比较长
    allowedFields: ['prompt', 'systemMessage']
  }),
  async (req, res) => {
  try {
    const { prompt, systemMessage } = req.body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' })
    }
    
    if (prompt.length > 50000) {
      return res.status(400).json({ error: 'Prompt is too long (max 50000 characters)' })
    }

    // Prepare messages for OpenAI API
    const messages = []
    
    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage
      })
    }

    messages.push({
      role: 'user',
      content: prompt
    })

    // Call OpenAI API
    const client = getOpenAIClient()
    const completion = await client.chat.completions.create({
      model: 'gpt-4o', // Latest and most capable model - faster, cheaper, and more powerful than gpt-4-turbo-preview
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000 // Increased token limit for better responses
    })

    const response = completion.choices[0].message.content

    res.json({
      content: response,
      model: completion.model,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    if (error.status === 401) {
      return res.status(401).json({
        error: 'Invalid OpenAI API key',
        message: 'Please check your OPENAI_API_KEY in .env file'
      })
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'OpenAI API rate limit exceeded. Please try again later.'
      })
    }

    res.status(500).json({
      error: 'Failed to get response from OpenAI',
      message: error.message
    })
  }
})

// Picture to LATEX API endpoint
router.post('/pic-to-latex',
  checkOpenAIKey,
  async (req, res) => {
    try {
      const { image, imageType } = req.body

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image is required' })
      }

      // Validate image type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      if (imageType && !allowedTypes.includes(imageType)) {
        return res.status(400).json({ error: 'Invalid image type' })
      }

      // Use GPT-4 Vision to analyze the image and generate LATEX
      const client = getOpenAIClient()
      
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert in mathematical notation and LaTeX. Your task is to analyze images containing mathematical formulas and convert them to accurate, valid LaTeX code.

IMPORTANT RULES:
1. Return ONLY the LaTeX code, nothing else - no explanations, no markdown, no code blocks
2. Use proper LaTeX syntax for all mathematical symbols
3. For fractions, use \\frac{numerator}{denominator}
4. For subscripts, use _{subscript}
5. For superscripts, use ^{superscript}
6. For square roots, use \\sqrt{content} or \\sqrt[n]{content} for nth root
7. For integrals, use \\int, \\int_{lower}^{upper}, \\iint, \\iiint
8. For sums and products, use \\sum_{i=1}^{n} and \\prod_{i=1}^{n}
9. For Greek letters, use proper LaTeX commands (\\alpha, \\beta, \\gamma, \\theta, \\pi, \\sigma, etc.)
10. For operators, use proper commands (\\sin, \\cos, \\log, \\ln, \\exp, \\max, \\min, etc.)
11. For matrices, use \\begin{pmatrix}...\\end{pmatrix} or \\begin{bmatrix}...\\end{bmatrix}
12. Ensure all brackets match properly
13. If the image contains text or non-mathematical content, still convert it to LaTeX format
14. Be precise with spacing and alignment

Examples:
- Simple equation: E = mc^2
- Fraction: \\frac{a}{b}
- Square root: \\sqrt{x^2 + y^2}
- Integral: \\int_{0}^{\\infty} f(x) dx
- Sum: \\sum_{i=1}^{n} x_i
- Greek letters: \\alpha, \\beta, \\theta, \\pi

Return the LaTeX code that can be directly used in a LaTeX document between $ signs for inline math or between $$ for display math.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image carefully and convert the mathematical formula to LaTeX code. 

Pay special attention to:
- All mathematical symbols and their proper LaTeX representations
- Subscripts and superscripts (use _{} and ^{})
- Fractions and divisions (use \\frac{}{})
- Square roots and other roots (use \\sqrt{} or \\sqrt[n]{})
- Special functions (sin, cos, log, ln, exp, max, min, etc.)
- Greek letters (\\alpha, \\beta, \\gamma, \\theta, \\pi, \\sigma, etc.)
- Operators and relations (=, <, >, ≤, ≥, ≠, ≈, etc.)
- Parentheses, brackets, and braces
- Alignment and spacing

Return ONLY the LaTeX code without any markdown formatting, code blocks, dollar signs, or explanations. The code should be ready to paste into a LaTeX document.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType || 'image/png'};base64,${image}`,
                  detail: 'high' // Request high detail for better accuracy
                }
              }
            ]
          }
        ],
        max_tokens: 2000, // Increased for complex formulas
        temperature: 0.1 // Low temperature for accuracy
      })

      let latexCode = completion.choices[0].message.content.trim()
      
      // Log original response for debugging
      console.log('Original AI response:', latexCode)
      
      // Enhanced cleanup - be more careful
      // Remove markdown code blocks
      latexCode = latexCode
        .replace(/^```latex\n?/i, '')
        .replace(/^```\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()
      
      // Remove dollar signs only if they wrap the entire content
      // Don't remove dollar signs that might be part of the formula
      if (latexCode.startsWith('$') && latexCode.endsWith('$') && latexCode.match(/\$/g)?.length === 2) {
        latexCode = latexCode.slice(1, -1).trim()
      }
      if (latexCode.startsWith('$$') && latexCode.endsWith('$$') && latexCode.match(/\$\$/g)?.length === 2) {
        latexCode = latexCode.slice(2, -2).trim()
      }
      
      // Remove common prefixes/suffixes that might be added
      latexCode = latexCode
        .replace(/^latex[:\s]*/i, '')
        .replace(/^code[:\s]*/i, '')
        .replace(/^formula[:\s]*/i, '')
        .trim()
      
      console.log('Cleaned LaTeX:', latexCode)
      
      // Validate that we have some content
      if (!latexCode || latexCode.length === 0) {
        return res.status(500).json({
          error: 'Failed to generate LaTeX code',
          message: 'The AI did not return valid LaTeX code. Please try again with a clearer image.'
        })
      }

      res.json({
        latex: latexCode,
        model: completion.model,
        usage: completion.usage
      })
    } catch (error) {
      console.error('Picture to LATEX API error:', error)
      
      // More detailed error logging
      if (error.response) {
        console.error('OpenAI API response error:', error.response.data)
      }
      
      if (error.status === 401) {
        return res.status(401).json({
          error: 'Invalid OpenAI API key',
          message: 'Please check your OPENAI_API_KEY in .env file'
        })
      }

      if (error.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'OpenAI API rate limit exceeded. Please try again later.'
        })
      }

      if (error.status === 400) {
        return res.status(400).json({
          error: 'Invalid image format',
          message: error.message || 'The image format is not supported or the image is corrupted.'
        })
      }

      res.status(500).json({
        error: 'Failed to convert image to LATEX',
        message: error.message || 'An error occurred while processing the image.'
      })
    }
  }
)

export default router

