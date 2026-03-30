import { useTranslation } from 'react-i18next'
import { useThemePreference } from '../../hooks/useThemePreference'

function SunIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path strokeLinecap="round" d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6" />
    </svg>
  )
}

function MoonIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.3 14.1a8.3 8.3 0 11-10.4-10.4 7.4 7.4 0 0010.4 10.4z" />
    </svg>
  )
}

const THEME_BUTTONS = [
  {
    key: 'light',
    Icon: SunIcon,
    labelKey: 'theme.light',
  },
  {
    key: 'dark',
    Icon: MoonIcon,
    labelKey: 'theme.dark',
  },
]

export default function ThemeSwitcher({ compact = false, className = '' }) {
  const { t } = useTranslation()
  const { preference, resolvedTheme, setTheme } = useThemePreference()
  const activeTheme = preference === 'system' ? resolvedTheme : preference

  return (
    <div className={`inline-flex items-center rounded-2xl border border-gray-300 bg-gray-100/90 p-1 backdrop-blur-sm ${className}`.trim()}>
      {THEME_BUTTONS.map(({ key, Icon, labelKey }) => {
        const active = activeTheme === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-label={t(labelKey)}
            title={`${t(labelKey)} (${t(`theme.current.${resolvedTheme}`)})`}
            className={[
              'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all duration-200',
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700',
              compact ? 'sm:px-2 sm:py-1.5 sm:text-[11px]' : '',
            ]
              .join(' ')
              .trim()}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span>{t(labelKey)}</span>}
          </button>
        )
      })}
    </div>
  )
}
