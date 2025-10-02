export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'theme'

function isWindowAvailable() {
  return typeof window !== 'undefined'
}

export function getStoredTheme(): ThemeMode | null {
  if (!isWindowAvailable()) return null
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch (error) {
    console.warn('Unable to read stored theme:', error)
  }
  return null
}

export function persistTheme(theme: ThemeMode) {
  if (!isWindowAvailable()) return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (error) {
    console.warn('Unable to persist theme preference:', error)
  }
}

export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (!isWindowAvailable()) {
    return theme === 'dark' ? 'dark' : 'light'
  }
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }
  return theme
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

export { THEME_STORAGE_KEY }
