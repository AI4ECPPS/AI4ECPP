import { useState, useCallback } from 'react'
import { validateAndSanitizeText, limitInputLength } from './security'

/**
 * 安全输入 Hook
 * 提供输入验证、清理和长度限制功能
 */
export const useSecureInput = (initialValue = '', options = {}) => {
  const {
    maxLength = 10000,
    minLength = 0,
    allowHTML = false,
    filterProfanity = false,
    required = false,
    onValidationChange = null
  } = options

  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [isValid, setIsValid] = useState(true)

  const handleChange = useCallback((e) => {
    const inputValue = e.target ? e.target.value : e
    const limitedValue = limitInputLength(inputValue, maxLength)
    
    setValue(limitedValue)
    
    // 实时验证
    const validation = validateAndSanitizeText(limitedValue, {
      maxLength,
      minLength,
      allowHTML,
      filterProfanity,
      required: required && limitedValue.length > 0 // 只在有内容时检查required
    })
    
    setIsValid(validation.valid)
    setError(validation.valid ? '' : validation.message)
    
    if (onValidationChange) {
      onValidationChange(validation.valid, validation.cleaned)
    }
  }, [maxLength, minLength, allowHTML, filterProfanity, required, onValidationChange])

  const validate = useCallback(() => {
    const validation = validateAndSanitizeText(value, {
      maxLength,
      minLength,
      allowHTML,
      filterProfanity,
      required
    })
    
    setIsValid(validation.valid)
    setError(validation.valid ? '' : validation.message)
    
    return validation
  }, [value, maxLength, minLength, allowHTML, filterProfanity, required])

  const reset = useCallback(() => {
    setValue(initialValue)
    setError('')
    setIsValid(true)
  }, [initialValue])

  return {
    value,
    error,
    isValid,
    handleChange,
    validate,
    reset,
    setValue
  }
}

export default useSecureInput

