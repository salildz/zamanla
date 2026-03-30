const PROFILE_NAME_PREFIX = 'zamanla_profile_name:'

function getStorageKey(userId) {
  return `${PROFILE_NAME_PREFIX}${userId}`
}

function sanitizeName(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function getStoredProfileName(userId) {
  if (!userId || typeof window === 'undefined') return ''

  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    return sanitizeName(value)
  } catch {
    return ''
  }
}

export function setStoredProfileName(userId, name) {
  if (!userId || typeof window === 'undefined') return

  const sanitized = sanitizeName(name)

  try {
    if (!sanitized) {
      window.localStorage.removeItem(getStorageKey(userId))
      return
    }

    window.localStorage.setItem(getStorageKey(userId), sanitized)
  } catch {
    // Ignore storage errors and keep flow uninterrupted.
  }
}
