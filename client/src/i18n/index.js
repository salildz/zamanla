import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import 'dayjs/locale/en'

import en from './locales/en.json'
import tr from './locales/tr.json'

const LANGUAGE_STORAGE_KEY = 'zamanla_language'
const SUPPORTED_LANGS = ['en', 'tr']
const FALLBACK_LANG = 'en'

function normalizeLanguage(value) {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().toLowerCase().replace('_', '-')
  if (!cleaned) return null

  const base = cleaned.split('-')[0]
  return SUPPORTED_LANGS.includes(base) ? base : null
}

function getStoredLanguage() {
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const normalized = normalizeLanguage(raw)
    if (raw && !normalized) {
      window.localStorage.removeItem(LANGUAGE_STORAGE_KEY)
    }
    return normalized
  } catch {
    return null
  }
}

function detectNavigatorLanguage() {
  if (typeof navigator === 'undefined') return null

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    navigator.userLanguage,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate)
    if (normalized) return normalized
  }

  return null
}

function detectInitialLanguage() {
  return getStoredLanguage() || detectNavigatorLanguage() || FALLBACK_LANG
}

function persistLanguage(lang) {
  const normalized = normalizeLanguage(lang) || FALLBACK_LANG
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized)
  } catch {
    // Ignore storage errors in private mode / restricted contexts.
  }
}

function syncHtmlLanguage(lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = normalizeLanguage(lang) || FALLBACK_LANG
}

const initialLanguage = detectInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: initialLanguage,
    fallbackLng: FALLBACK_LANG,
    supportedLngs: SUPPORTED_LANGS,
    load: 'languageOnly',
    cleanCode: true,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    showSupportNotice: false,
  })

// Keep dayjs locale in sync with i18n language
function syncDayjsLocale(lang) {
  const dayjsLang = lang && lang.startsWith('tr') ? 'tr' : 'en'
  dayjs.locale(dayjsLang)
}

syncDayjsLocale(initialLanguage)
syncHtmlLanguage(initialLanguage)
persistLanguage(initialLanguage)

i18n.on('languageChanged', (lang) => {
  syncDayjsLocale(lang)
  syncHtmlLanguage(lang)
  persistLanguage(lang)
})

export default i18n
