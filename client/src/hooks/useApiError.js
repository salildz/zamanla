import { useTranslation } from 'react-i18next'

/**
 * Returns a localized error message for an API error.
 * Maps known server error codes to translation keys; falls back
 * to the raw server message or a generic "unknown error" string.
 */
export function useApiError(error) {
  const { t } = useTranslation()

  if (!error) return null

  if (error.serverCode === 'NETWORK_ERROR') {
    return t('errors.networkError')
  }

  if (error.serverCode) {
    const key = `errors.${error.serverCode}`
    const translated = t(key)
    // i18next returns the key itself if no translation found
    if (translated !== key) return translated
  }

  return error.userMessage || t('errors.unknownError')
}
