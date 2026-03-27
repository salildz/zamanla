import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en'

  const toggle = () => {
    i18n.changeLanguage(currentLang === 'tr' ? 'en' : 'tr')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-100 tracking-wide"
    >
      {currentLang === 'tr' ? 'EN' : 'TR'}
    </button>
  )
}
