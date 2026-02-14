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

// Models that only support default temperature (1) - omit temperature param for these
const MODELS_DEFAULT_TEMPERATURE_ONLY = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano']

/**
 * Build temperature param for Chat Completions. Newer models (GPT-5, GPT-4.1) only support default (1).
 * @param {string} model - Model ID
 * @param {number} desiredTemp - Desired temperature (e.g. 0.3, 0.7)
 * @returns {object} Params to spread into create() - empty {} for models that need default
 */
export function buildTemperatureParam(model, desiredTemp) {
  if (!model || typeof model !== 'string') return { temperature: desiredTemp }
  const useDefaultOnly = MODELS_DEFAULT_TEMPERATURE_ONLY.some(m => model.startsWith(m)) ||
    model.startsWith('gpt-5') || model.startsWith('gpt-4.1')
  if (useDefaultOnly) return {}
  return { temperature: desiredTemp }
}
