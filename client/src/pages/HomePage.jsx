import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/common/Button.jsx'
import Brand from '../components/common/Brand.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import { useCurrentUser, useLogout } from '../hooks/useAuth.js'

const featureKeys = ['flexible', 'recurring', 'group', 'timezone', 'sharing', 'export']

const featureIcons = [
  <svg key="flexible" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>,
  <svg key="recurring" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="group" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="timezone" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
  </svg>,
  <svg key="sharing" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>,
  <svg key="export" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>,
]

// Mini availability artifact for the hero — density ramp toward pine green.
const heatmapPattern = [
  0.08, 0.16, 0.2, 0.36, 0.24, 0.12, 0.08,
  0.12, 0.24, 0.38, 0.62, 0.44, 0.2, 0.14,
  0.14, 0.32, 0.54, 0.86, 0.6, 0.28, 0.18,
  0.12, 0.22, 0.36, 0.56, 0.4, 0.24, 0.16,
  0.08, 0.14, 0.22, 0.3, 0.26, 0.14, 0.1,
]

function heatTone(level) {
  if (level >= 0.8) return '#2f5043'
  if (level >= 0.55) return '#3e6453'
  if (level >= 0.35) return '#5a8470'
  if (level >= 0.2) return '#82a593'
  return 'rgba(90, 132, 112, 0.16)'
}

export default function HomePage() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()

  const howItWorksSteps = [
    { step: '01', title: t('home.howItWorks.step1Title'), desc: t('home.howItWorks.step1Desc') },
    { step: '02', title: t('home.howItWorks.step2Title'), desc: t('home.howItWorks.step2Desc') },
    { step: '03', title: t('home.howItWorks.step3Title'), desc: t('home.howItWorks.step3Desc') },
  ]

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <nav className="border-b border-sand-200/80 bg-sand-50/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="Zamanla home">
            <Brand size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link to="/my/schedules" className="hidden sm:block">
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
              <Link to="/auth?mode=login" className="hidden sm:block">
                <Button variant="ghost" size="sm">{t('auth.actions.login')}</Button>
              </Link>
            )}
            <Link to="/create">
              <Button variant="primary" size="sm">{t('nav.newSession')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <div className="reveal-up" style={{ '--reveal-delay': '40ms' }}>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-clay-700 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-clay-500" />
              {t('home.badge')}
            </div>

            <h1 className="font-display text-[2rem] leading-[1.1] sm:text-5xl lg:text-[4.4rem] sm:leading-[1.04] font-semibold text-sand-900 tracking-tight mb-6 text-balance break-words">
              {t('home.heroTitle')}
              <br />
              <span className="italic font-medium text-clay-600">{t('home.heroTitleHighlight')}</span>
            </h1>

            <p className="text-lg sm:text-xl text-sand-700 max-w-xl mb-9 leading-relaxed">
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

            <p className="mt-5 text-sm text-sand-500">{t('home.ctaFooter')}</p>
          </div>

          {/* Hero artifact — a warm "session card" */}
          <div className="relative reveal-up" style={{ '--reveal-delay': '140ms' }}>
            <div className="panel-raised p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-sand-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-clay-500" />
                  <p className="font-display text-base font-semibold text-sand-900">{t('home.features.groupTitle')}</p>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-sand-500">Mon–Sun</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {heatmapPattern.map((level, idx) => (
                  <span
                    key={idx}
                    className="h-5 rounded-[5px] ring-1 ring-inset ring-sand-200"
                    style={{ backgroundColor: heatTone(level) }}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-pine-50 border border-pine-200 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-pine-600 text-white text-xs font-bold">✓</span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-pine-700">Thu · 18:00</p>
                    <p className="text-[11px] text-pine-600">{t('results.bestTimes.title')}</p>
                  </div>
                </div>
                <span className="font-display text-lg font-semibold text-pine-700">92%</span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px] text-sand-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(90,132,112,0.16)' }} /> 0</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#5a8470' }} /> few</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#2f5043' }} /> all</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 absolute -bottom-4 -left-4 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-2.5 shadow-[var(--shadow-soft)]">
              <span className="font-mono text-xs text-sand-500">no signup</span>
              <span className="w-1 h-1 rounded-full bg-clay-400" />
              <span className="font-mono text-xs text-sand-500">just a link</span>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="border-y border-sand-200 bg-sand-50/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between gap-6 mb-10">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-sand-900 max-w-md text-balance">
                {t('home.howItWorksTitle')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-sand-200 rounded-2xl overflow-hidden border border-sand-200">
              {howItWorksSteps.map((item, index) => (
                <article
                  key={item.step}
                  className="bg-sand-50 p-6 sm:p-8 reveal-up"
                  style={{ '--reveal-delay': `${80 + index * 90}ms` }}
                >
                  <span className="font-display text-5xl font-medium text-clay-300 leading-none">{item.step}</span>
                  <h3 className="font-display text-xl font-semibold text-sand-900 mt-5 mb-2">{item.title}</h3>
                  <p className="text-sm text-sand-600 leading-relaxed">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-sand-900 mb-3">{t('home.featuresTitle')}</h2>
              <p className="text-sand-600 text-lg">{t('home.featuresSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featureKeys.map((key, i) => (
                <article
                  key={key}
                  className="surface-card rounded-2xl p-6 hover-lift-soft reveal-up"
                  style={{ '--reveal-delay': `${90 + i * 70}ms` }}
                >
                  <div className="w-11 h-11 bg-clay-100 text-clay-600 rounded-xl flex items-center justify-center mb-4 ring-1 ring-clay-200/60">
                    {featureIcons[i]}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-sand-900 mb-1.5">{t(`home.features.${key}Title`)}</h3>
                  <p className="text-sm text-sand-600 leading-relaxed">{t(`home.features.${key}Desc`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────────────────── */}
        <section className="pb-20 sm:pb-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-pine-600 px-6 sm:px-12 py-14 sm:py-16 text-center reveal-up">
              <div
                className="absolute inset-0 opacity-[0.5] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.10), transparent 38%), radial-gradient(circle at 86% 84%, rgba(194,96,47,0.30), transparent 42%)' }}
              />
              <div className="relative">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-sand-50 mb-4 text-balance">{t('home.ctaSectionTitle')}</h2>
                <p className="text-pine-100 mb-8 max-w-xl mx-auto text-lg">{t('home.ctaSectionSubtitle')}</p>
                <Link to="/create">
                  <Button variant="primary" size="xl" className="!bg-clay-500 hover:!bg-clay-400 !border-clay-400">
                    {t('home.ctaSectionButton')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-sand-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-sand-500">
            <Link to="/"><Brand size="sm" /></Link>
            <p>{t('home.footerTagline')}</p>
          </div>
        </footer>
      </main>

      {/* Mobile sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-sand-50/95 border-t border-sand-200"
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
