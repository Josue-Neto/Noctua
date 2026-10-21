import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialActivities, initialProfile } from '../data/initialActivities'
import type { Activity, ActivityStatus, ActivityValues, Preferences, UserProfile } from '../types/platform'

type PlatformContextValue = {
  activities: Activity[]
  profile: UserProfile
  preferences: Preferences
  setProfile: (profile: UserProfile) => void
  setDarkMode: (enabled: boolean) => void
  updatePreferences: (preferences: Preferences) => void
  toggleActivity: (id: number) => void
  saveActivity: (values: ActivityValues, status: ActivityStatus, id?: number) => void
  cancelActivity: (id: number) => void
}

const defaultPreferences: Preferences = {
  darkMode: false,
  highContrast: false,
  dyslexiaFont: false,
  notifications: true,
  emailReminders: false,
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState(initialActivities)
  const [profile, setProfile] = useState(initialProfile)
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null)
  const [preferences, setPreferences] = useState(() => ({
    ...defaultPreferences,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  }))

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.darkMode ? 'dark' : 'light'
    document.documentElement.style.colorScheme = preferences.darkMode ? 'dark' : 'light'
  }, [preferences.darkMode])

  useEffect(() => {
    if (themeOverride !== null) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateFromSystem = (event: MediaQueryListEvent) => {
      setPreferences((current) => ({ ...current, darkMode: event.matches }))
    }
    mediaQuery.addEventListener('change', updateFromSystem)
    return () => mediaQuery.removeEventListener('change', updateFromSystem)
  }, [themeOverride])

  const value = useMemo<PlatformContextValue>(() => ({
    activities,
    profile,
    preferences,
    setProfile,
    setDarkMode: (enabled) => {
      setThemeOverride(enabled)
      setPreferences((current) => ({ ...current, darkMode: enabled }))
    },
    updatePreferences: setPreferences,
    toggleActivity: (id) => setActivities((current) =>
      current.map((activity) => activity.id === id ? { ...activity, done: !activity.done } : activity),
    ),
    saveActivity: (values, status, id) => setActivities((current) => id
      ? current.map((activity) => activity.id === id ? { ...activity, ...values, status } : activity)
      : [{ id: Date.now(), ...values, done: false, status }, ...current],
    ),
    cancelActivity: (id) => setActivities((current) =>
      current.map((activity) => activity.id === id ? { ...activity, status: 'cancelled' } : activity),
    ),
  }), [activities, preferences, profile])

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) throw new Error('usePlatform precisa ser usado dentro de PlatformProvider.')
  return context
}
