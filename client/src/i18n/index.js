import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import 'dayjs/locale/en'

import en from './locales/en.json'
import tr from './locales/tr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr'],
    // Strip region codes so 'tr-TR', 'en-US' etc. resolve to 'tr', 'en'
    load: 'languageOnly',
    detection: {
      // Check localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'zamanla_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

// Keep dayjs locale in sync with i18n language
function syncDayjsLocale(lang) {
  const dayjsLang = lang && lang.startsWith('tr') ? 'tr' : 'en'
  dayjs.locale(dayjsLang)
}

syncDayjsLocale(i18n.language)
i18n.on('languageChanged', syncDayjsLocale)

export default i18n
