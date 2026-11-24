import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api as request, ApiError } from '../lib/api'
import { dateParts, schoolInstant } from '../lib/dates'
import { disablePush } from '../lib/push'
import type {
  Activity,
  ActivityStatus,
  ActivityValues,
  AuthUser,
  ClassSlot,
  Preferences,
  UserProfile,
} from '../types/platform'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'
type ServerActivity = Omit<Activity, 'kind' | 'dueDate' | 'time'> & {
  type: 'assignment' | 'exam' | 'event' | 'notice'
}
const kindMap = {
  assignment: 'Atividade',
  exam: 'Prova',
  event: 'Evento',
  notice: 'Aviso',
} as const
const defaults: Preferences = {
  theme: 'system',
  darkMode: false,
  highContrast: false,
  dyslexiaFont: false,
  notifications: true,
  emailReminders: false,
  pushEnabled: false,
  remind24Hours: true,
  remind48Hours: true,
}
const emptyProfile: UserProfile = {
  name: '',
  email: '',
  institution: '',
  className: '',
  course: '',
  bio: '',
  avatar: '',
}
type Value = {
  activities: Activity[]
  profile: UserProfile
  preferences: Preferences
  authUser: AuthUser | null
  authStatus: AuthStatus
  catalog: ClassSlot[]
  schoolTimezone: string
  loading: boolean
  error: string
  pending: boolean
  setProfile: (profile: UserProfile) => Promise<void>
  setDarkMode: (enabled: boolean) => Promise<void>
  updatePreferences: (preferences: Partial<Preferences>) => Promise<void>
  toggleActivity: (id: string) => Promise<void>
  getActivity: (id: string) => Promise<Activity>
  saveActivity: (
    values: ActivityValues,
    status: ActivityStatus,
    id?: string,
  ) => Promise<void>
  cancelActivity: (id: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  reloadData: () => Promise<void>
}
const Context = createContext<Value | null>(null)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [profile, updateProfile] = useState(emptyProfile)
  const [preferences, setPreferences] = useState(defaults)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [catalog, setCatalog] = useState<ClassSlot[]>([])
  const [schoolTimezone, setTimezone] = useState('America/Sao_Paulo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const generation = useRef(0)
  const busy = useRef(false)
  async function api<T>(path: string, options: RequestInit = {}) {
    const current = generation.current
    const result = await request<T>(path, options)
    if (current !== generation.current)
      throw new Error('A sessão mudou. Entre novamente para continuar.')
    return result
  }
  const [systemDark, setSystemDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const clear = useCallback(() => {
    generation.current++
    setAuthUser(null)
    setActivities([])
    updateProfile(emptyProfile)
    setCatalog([])
    setPreferences(defaults)
    setError('')
    setLoading(false)
    setAuthStatus('anonymous')
  }, [])
  useEffect(() => {
    window.addEventListener('noctua:unauthorized', clear)
    return () => window.removeEventListener('noctua:unauthorized', clear)
  }, [clear])

  function convert(row: ServerActivity, tz = schoolTimezone): Activity {
    return { ...row, kind: kindMap[row.type], ...dateParts(row.dueAt, tz) }
  }
  async function loadData() {
    const current = generation.current
    setLoading(true)
    setError('')
    try {
      const [nextProfile, nextPreferences, nextCatalog] = await Promise.all([
        api<UserProfile & { schoolTimezone: string }>('/me/profile'),
        api<Preferences>('/me/preferences'),
        api<ClassSlot[]>('/staff/classes'),
      ])
      let rows: ServerActivity[] = []
      let page = 1
      let total = 1
      while (rows.length < total) {
        const result = await api<{ items: ServerActivity[]; total: number }>(
          `/me/activities?page=${page++}&limit=100`,
        )
        rows = rows.concat(result.items)
        total = result.total
        if (!result.items.length) break
      }
      if (current !== generation.current) return
      updateProfile(nextProfile)
      setTimezone(nextProfile.schoolTimezone)
      setPreferences(nextPreferences)
      setCatalog(nextCatalog)
      setActivities(rows.map((row) => convert(row, nextProfile.schoolTimezone)))
    } catch (cause) {
      if (current === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar sua agenda.',
        )
      throw cause
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }
  async function refreshAuth() {
    const current = generation.current
    try {
      const user = await api<AuthUser>('/auth/me')
      if (current !== generation.current) return
      setAuthUser(user)
      await loadData()
      if (current === generation.current) setAuthStatus('authenticated')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) return
      if (current === generation.current) {
        setError(cause instanceof Error ? cause.message : 'API indisponível.')
        setAuthStatus('error')
      }
    }
  }
  useEffect(() => {
    void refreshAuth()
  }, [])
  const darkMode =
    preferences.theme === 'dark' ||
    (preferences.theme === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  async function mutate<T>(action: () => Promise<T>): Promise<T> {
    const current = generation.current
    if (busy.current) throw new Error('Aguarde a operação atual terminar.')
    busy.current = true
    setPending(true)
    setError('')
    try {
      return await action()
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : 'Falha ao salvar.')
      throw cause
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const updatePreferences = async (next: Partial<Preferences>) => {
    if (authStatus !== 'authenticated') {
      setPreferences((current) => ({ ...current, ...next }))
      return
    }
    const { darkMode: _unused, ...body } = next
    await mutate(async () => {
      setPreferences(
        await api<Preferences>('/me/preferences', {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      )
    })
  }
  const getActivity = useCallback(
    async (id: string) => {
      const currentGeneration = generation.current
      try {
        const row = await request<ServerActivity>(
          `/activities/${encodeURIComponent(id)}`,
        )
        if (currentGeneration !== generation.current)
          throw new Error('A sessão mudou. Entre novamente para continuar.')
        const saved: Activity = {
          ...row,
          kind: kindMap[row.type],
          ...dateParts(row.dueAt, schoolTimezone),
        }
        setActivities((current) => [
          saved,
          ...current.filter((item) => item.id !== id),
        ])
        return saved
      } catch (cause) {
        if (
          currentGeneration === generation.current &&
          cause instanceof ApiError &&
          cause.status === 404
        ) {
          setActivities((current) => current.filter((item) => item.id !== id))
        }
        throw cause
      }
    },
    [schoolTimezone],
  )
  const value: Value = {
    activities: [...activities].sort(
      (a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id),
    ),
    profile,
    preferences: { ...preferences, darkMode },
    authUser,
    authStatus,
    catalog,
    schoolTimezone,
    loading,
    error,
    pending,
    refreshAuth,
    reloadData: loadData,
    getActivity,
    setProfile: async (next) => {
      await mutate(async () => {
        const saved = await api<UserProfile>('/me/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            name: next.name,
            bio: next.bio,
            avatar: next.avatar,
          }),
        })
        updateProfile(saved)
        setAuthUser((current) =>
          current ? { ...current, fullName: saved.name } : null,
        )
      })
    },
    updatePreferences,
    setDarkMode: (enabled) =>
      updatePreferences({ theme: enabled ? 'dark' : 'light' }),
    toggleActivity: async (id) => {
      await mutate(async () => {
        const activity = activities.find((a) => a.id === id)
        if (!activity) return
        const result = await api<{ completed: boolean }>(
          `/activities/${id}/checklist`,
          {
            method: 'PUT',
            body: JSON.stringify({ completed: !activity.done }),
          },
        )
        setActivities((current) =>
          current.map((a) =>
            a.id === id ? { ...a, done: result.completed } : a,
          ),
        )
      })
    },
    saveActivity: async (values, status, id) => {
      await mutate(async () => {
        const type = Object.entries(kindMap).find(
          ([, label]) => label === values.kind,
        )![0]
        const row = await api<ServerActivity>(
          id ? `/activities/${id}` : '/activities',
          {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify({
              classSubjectId: values.classSubjectId,
              title: values.title,
              detail: values.detail,
              type,
              dueAt: schoolInstant(values.dueDate, values.time, schoolTimezone),
              status,
              attachments: values.attachments.map(({ name, url }) => ({
                name,
                url,
              })),
            }),
          },
        )
        const saved = convert(row)
        setActivities((current) => [
          saved,
          ...current.filter((a) => a.id !== saved.id),
        ])
      })
    },
    cancelActivity: async (id) => {
      await mutate(async () => {
        const row = await api<ServerActivity>(`/activities/${id}/cancel`, {
          method: 'POST',
        })
        setActivities((current) =>
          current.map((a) => (a.id === id ? convert(row) : a)),
        )
      })
    },
    login: async (email, password) => {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      generation.current++
      await refreshAuth()
    },
    logout: async () => {
      if (authUser?.role === 'student') await disablePush()
      await api('/auth/logout', { method: 'POST' })
      clear()
    },
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function usePlatform() {
  const context = useContext(Context)
  if (!context) throw new Error('PlatformProvider ausente')
  return context
}
