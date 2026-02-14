/**
 * Centralized OpenAI model configuration.
 * Default: gpt-5-nano (fastest). Override via OPENAI_CHAT_MODEL env or request body.
 */
export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5-nano'

const ALLOWED_MODELS = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5.2', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini']

/**
 * Resolve which model to use. Priority: req.body.model (if allowed) > env > default.
 * @param {object} req - Express request (optional)
 * @returns {string} Model ID
 */
export function getChatModel(req = null) {
  const fromBody = req?.body?.model
  if (fromBody && typeof fromBody === 'string' && ALLOWED_MODELS.includes(fromBody)) {
    return fromBody
  }
  return OPENAI_CHAT_MODEL
}
