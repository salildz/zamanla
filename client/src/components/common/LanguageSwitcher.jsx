import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.resolvedLanguage?.startsWith('tr') ? 'tr' : 'en'

  const setLanguage = (lang) => {
    if (lang !== currentLang) {
      i18n.changeLanguage(lang)
    }
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100/90 p-1 backdrop-blur-sm">
      <span className="pl-1.5 pr-1 text-gray-400" aria-hidden="true">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0c2.2 2.4 3.5 5.66 3.5 9S14.2 18.6 12 21m0-18c-2.2 2.4-3.5 5.66-3.5 9S9.8 18.6 12 21m-8.4-6h16.8M3.6 9h16.8" />
        </svg>
      </span>
      <button
        type="button"
        onClick={() => setLanguage('tr')}
        aria-label="Switch language to Turkish"
        className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
          currentLang === 'tr'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-200'
        }`}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="Switch language to English"
        className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
          currentLang === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-200'
        }`}
      >
        EN
      </button>
    </div>
  )
}
