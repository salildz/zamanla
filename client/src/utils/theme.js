export const THEME_STORAGE_KEY = 'zamanla_theme'
export const THEME_CHANGE_EVENT = 'zamanla:themechange'
export const THEME_PREFERENCES = ['light', 'dark', 'system']
export const DEFAULT_THEME_PREFERENCE = 'system'

let mediaQuery = null
let systemListenerAttached = false

function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : DEFAULT_THEME_PREFERENCE
}

function dispatchThemeChange(preference, resolvedTheme) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { preference, resolvedTheme },
    })
  )
}

export function getStoredThemePreference() {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    const normalized = normalizeThemePreference(value)
    if (value && value !== normalized) {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
      return null
    }
    return value ? normalized : null
  } catch {
    return null
  }
}

export function getSystemPrefersDark() {
  if (typeof window === 'undefined') return false
  if (!window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(preference, prefersDark = getSystemPrefersDark()) {
  const normalized = normalizeThemePreference(preference)
  if (normalized === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return normalized
}

export function applyResolvedTheme(theme) {
  if (typeof document === 'undefined') return
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light'
  const root = document.documentElement
  root.dataset.theme = resolvedTheme
  root.classList.toggle('dark', resolvedTheme === 'dark')
}

export function getCurrentResolvedTheme() {
  if (typeof document === 'undefined') {
    return resolveTheme(getStoredThemePreference() || DEFAULT_THEME_PREFERENCE)
  }

  const fromDataset = document.documentElement.dataset.theme
  if (fromDataset === 'dark' || fromDataset === 'light') {
    return fromDataset
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setThemePreference(preference, options = {}) {
  const normalized = normalizeThemePreference(preference)
  const persist = options.persist !== false

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized)
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }
  }

  const resolvedTheme = resolveTheme(normalized)
  applyResolvedTheme(resolvedTheme)
  dispatchThemeChange(normalized, resolvedTheme)

  return { preference: normalized, resolvedTheme }
}

function handleSystemThemeChange(event) {
  const preference = getStoredThemePreference() || DEFAULT_THEME_PREFERENCE
  if (preference !== 'system') return

  const resolvedTheme = resolveTheme('system', event.matches)
  applyResolvedTheme(resolvedTheme)
  dispatchThemeChange('system', resolvedTheme)
}

function attachSystemListener() {
  if (systemListenerAttached || typeof window === 'undefined' || !window.matchMedia) {
    return
  }

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleSystemThemeChange)
  }

  systemListenerAttached = true
}

export function initializeTheme() {
  const preference = getStoredThemePreference() || DEFAULT_THEME_PREFERENCE
  const resolvedTheme = resolveTheme(preference)

  applyResolvedTheme(resolvedTheme)
  dispatchThemeChange(preference, resolvedTheme)
  attachSystemListener()

  return { preference, resolvedTheme }
}
