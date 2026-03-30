import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'
import { PageLoader } from '../components/common/LoadingSpinner.jsx'
import { useCurrentUser, useLogin, useRegister } from '../hooks/useAuth.js'
import { useApiError } from '../hooks/useApiError.js'

function isSafeNextPath(nextPath) {
  if (!nextPath) return false
  return nextPath.startsWith('/') && !nextPath.startsWith('//')
}

function buildSchema(mode, t) {
  const base = {
    email: z
      .string()
      .trim()
      .email(t('auth.validation.emailInvalid')),
    password: z
      .string()
      .min(mode === 'register' ? 8 : 1, mode === 'register' ? t('auth.validation.passwordMin') : t('auth.validation.passwordRequired')),
  }

  return z.object(base)
}

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const nextRaw = searchParams.get('next')
  const nextPath = isSafeNextPath(nextRaw) ? nextRaw : '/my/schedules'

  const schema = useMemo(() => buildSchema(mode, t), [mode, t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { data: user, isLoading: userLoading } = useCurrentUser()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const activeMutation = mode === 'register' ? registerMutation : loginMutation
  const errorMessage = useApiError(activeMutation.error)

  useEffect(() => {
    if (!userLoading && user) {
      navigate(nextPath, { replace: true })
    }
  }, [user, userLoading, navigate, nextPath])

  const onSubmit = (values) => {
    const mutation = mode === 'register' ? registerMutation : loginMutation
    mutation.mutate(values, {
      onSuccess: () => {
        navigate(nextPath, { replace: true })
      },
    })
  }

  const switchMode = (nextMode) => {
    const params = new URLSearchParams(searchParams)
    params.set('mode', nextMode)
    if (nextRaw) {
      params.set('next', nextRaw)
    }
    setSearchParams(params, { replace: true })
  }

  if (userLoading) {
    return <PageLoader message={t('auth.loading')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Zamanla</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
        <div className="surface-card border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-7">
          <div className="mb-5">
            <div className="inline-flex rounded-full bg-gray-100 p-1 mb-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('auth.mode.login')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('auth.mode.register')}
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {mode === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('auth.subtitle')}</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label={t('auth.fields.email')}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              required
              {...register('email')}
            />
            <Input
              label={t('auth.fields.password')}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              error={errors.password?.message}
              hint={mode === 'register' ? t('auth.passwordHint') : undefined}
              required
              {...register('password')}
            />

            {errorMessage && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={activeMutation.isPending}
            >
              {mode === 'register' ? t('auth.actions.createAccount') : t('auth.actions.login')}
            </Button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            {t('auth.optionalNote')}
          </p>
        </div>
      </main>
    </div>
  )
}
