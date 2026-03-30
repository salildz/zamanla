import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/common/Button.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'
import { useCurrentUser, useLogout } from '../hooks/useAuth.js'

const featureKeys = [
  'flexible',
  'recurring',
  'group',
  'timezone',
  'sharing',
  'export',
]

const featureIcons = [
  <svg key="flexible" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>,
  <svg key="recurring" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="group" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="timezone" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
  </svg>,
  <svg key="sharing" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>,
  <svg key="export" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>,
]

const heroFeatureKeys = ['sharing', 'group', 'timezone']
const heatmapPattern = [
  0.08, 0.16, 0.2, 0.36, 0.24, 0.12, 0.08,
  0.12, 0.24, 0.38, 0.62, 0.44, 0.2, 0.14,
  0.14, 0.32, 0.54, 0.86, 0.6, 0.28, 0.18,
  0.12, 0.22, 0.36, 0.56, 0.4, 0.24, 0.16,
  0.08, 0.14, 0.22, 0.3, 0.26, 0.14, 0.1,
]

function heatTone(level) {
  if (level >= 0.8) return 'rgba(61, 214, 157, 0.84)'
  if (level >= 0.55) return 'rgba(81, 192, 240, 0.82)'
  if (level >= 0.35) return 'rgba(94, 182, 245, 0.66)'
  if (level >= 0.2) return 'rgba(108, 164, 229, 0.48)'
  return 'rgba(125, 148, 192, 0.3)'
}

export default function HomePage() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()

  const howItWorksSteps = [
    { step: '1', title: t('home.howItWorks.step1Title'), desc: t('home.howItWorks.step1Desc') },
    { step: '2', title: t('home.howItWorks.step2Title'), desc: t('home.howItWorks.step2Desc') },
    { step: '3', title: t('home.howItWorks.step3Title'), desc: t('home.howItWorks.step3Desc') },
  ]

  const featureCardClasses = [
    'lg:col-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Zamanla</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
            {user ? (
              <>
                <Link to="/my/schedules">
                  <Button variant="secondary" size="sm">{t('nav.mySchedules')}</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  loading={logoutMutation.isPending}
                >
                  {t('auth.actions.logout')}
                </Button>
              </>
            ) : (
              <Link to="/auth?mode=login">
                <Button variant="secondary" size="sm">{t('auth.actions.login')}</Button>
              </Link>
            )}
            <Link to="/create">
              <Button variant="primary" size="sm">{t('nav.newSession')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_-4%,rgba(68,188,255,.23),transparent_41%),radial-gradient(circle_at_85%_8%,rgba(255,133,93,.15),transparent_37%)]" />
        <div className="absolute right-[-8rem] top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(120,226,194,.24),rgba(120,226,194,0))] blur-3xl pointer-events-none float-gentle" />

        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-center">
          <div className="reveal-up" style={{ '--reveal-delay': '40ms' }}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 border border-indigo-200">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {t('home.badge')}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 text-balance leading-tight">
              {t('home.heroTitle')}
              <br />
              <span className="text-indigo-600">{t('home.heroTitleHighlight')}</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 max-w-xl mb-8 text-balance leading-relaxed">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/create">
                <Button variant="primary" size="xl" className="w-full sm:w-auto">
                  {t('home.ctaButton')}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link to="/auth?mode=login">
                <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                  {t('auth.actions.login')}
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-sm text-gray-400">{t('home.ctaFooter')}</p>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl">
              {heroFeatureKeys.map((key, index) => (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 bg-gray-50/80 backdrop-blur-md px-3 py-2.5 hover-lift-soft reveal-up"
                  style={{ '--reveal-delay': `${180 + (index * 70)}ms` }}
                >
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Zamanla</p>
                  <p className="text-sm text-gray-800 font-semibold mt-0.5">{t(`home.features.${key}Title`)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative reveal-up" style={{ '--reveal-delay': '120ms' }}>
            <div className="surface-card rounded-[28px] p-4 sm:p-5 border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">{t('home.features.groupTitle')}</p>
                <span className="text-xs text-gray-500">{t('home.howItWorksTitle')}</span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3">
                <div className="grid grid-cols-7 gap-1.5">
                  {heatmapPattern.map((level, idx) => (
                    <span
                      key={idx}
                      className="h-4 rounded-md border border-gray-200"
                      style={{ backgroundColor: heatTone(level) }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {howItWorksSteps.map((item, index) => (
                  <div
                    key={item.step}
                    className="rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 flex items-start gap-2.5 hover-lift-soft reveal-up"
                    style={{ '--reveal-delay': `${260 + (index * 90)}ms` }}
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:block absolute -bottom-5 -left-5 rounded-2xl border border-indigo-200 bg-indigo-50/80 backdrop-blur-md px-4 py-3 shadow-lg">
              <p className="text-[11px] uppercase tracking-wider text-indigo-700 font-semibold">{t('home.howItWorksTitle')}</p>
              <p className="text-sm text-gray-900 font-semibold">{t('home.features.groupTitle')}</p>
            </div>
          </div>

        </section>

        <section className="py-14 sm:py-20 border-y border-gray-100 bg-gray-50/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">{t('home.howItWorksTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
              {howItWorksSteps.map((item, index) => (
                <article
                  key={item.step}
                  className="surface-card rounded-2xl p-5 sm:p-6 text-left relative overflow-hidden hover-lift-soft reveal-up"
                  style={{ '--reveal-delay': `${80 + (index * 90)}ms` }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(89,185,248,.8),rgba(117,224,191,.8))]" />
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-base font-bold mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  {index < howItWorksSteps.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-indigo-500/70">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">{t('home.featuresTitle')}</h2>
            <p className="text-gray-500 text-center mb-10">{t('home.featuresSubtitle')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featureKeys.map((key, i) => (
                <article
                  key={key}
                  className={`surface-card rounded-2xl p-5 hover-lift-soft reveal-up ${featureCardClasses[i]}`}
                  style={{ '--reveal-delay': `${90 + (i * 70)}ms` }}
                >
                  <div className="w-11 h-11 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                    {featureIcons[i]}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{t(`home.features.${key}Title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`home.features.${key}Desc`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-[linear-gradient(140deg,rgba(21,32,54,.95),rgba(17,44,69,.9))] px-6 sm:px-10 py-10 text-center shadow-xl reveal-up" style={{ '--reveal-delay': '60ms' }}>
              <div className="absolute left-0 top-0 h-full w-full pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(116,208,255,.25),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(255,145,103,.16),transparent_32%)]" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('home.ctaSectionTitle')}</h2>
                <p className="text-gray-500 mb-8 max-w-xl mx-auto">{t('home.ctaSectionSubtitle')}</p>
                <Link to="/create">
                  <Button variant="primary" size="xl">{t('home.ctaSectionButton')}</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
              </div>
              <span className="font-semibold text-gray-600">Zamanla</span>
            </div>
            <p>{t('home.footerTagline')}</p>
          </div>
        </footer>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="px-4 py-3">
          <Link to="/create">
            <Button variant="primary" size="lg" fullWidth>{t('home.ctaButton')}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
