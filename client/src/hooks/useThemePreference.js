import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_CHANGE_EVENT,
  THEME_PREFERENCES,
  getCurrentResolvedTheme,
  getStoredThemePreference,
  setThemePreference,
} from '../utils/theme'

export function useThemePreference() {
  const [preference, setPreference] = useState(() => getStoredThemePreference() || DEFAULT_THEME_PREFERENCE)
  const [resolvedTheme, setResolvedTheme] = useState(() => getCurrentResolvedTheme())

  useEffect(() => {
    function handleThemeChange(event) {
      const detail = event?.detail || {}
      setPreference(detail.preference || getStoredThemePreference() || DEFAULT_THEME_PREFERENCE)
      setResolvedTheme(detail.resolvedTheme || getCurrentResolvedTheme())
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
  }, [])

  const setTheme = useCallback((nextPreference) => {
    const { preference: normalized, resolvedTheme: nextResolvedTheme } = setThemePreference(nextPreference)
    setPreference(normalized)
    setResolvedTheme(nextResolvedTheme)
  }, [])

  return useMemo(
    () => ({
      preference,
      resolvedTheme,
      setTheme,
      themeOptions: THEME_PREFERENCES,
    }),
    [preference, resolvedTheme, setTheme]
  )
}
