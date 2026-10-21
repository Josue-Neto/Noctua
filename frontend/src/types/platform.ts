export type ActivityKind = 'Atividade' | 'Prova' | 'Evento' | 'Aviso'
export type ActivityStatus = 'published' | 'draft' | 'cancelled'

export type Activity = {
  id: number
  title: string
  subject: string
  kind: ActivityKind
  dueDate: string
  time: string
  detail: string
  attachments: string[]
  done: boolean
  status: ActivityStatus
}

export type UserProfile = {
  name: string
  email: string
  institution: string
  className: string
  course: string
  bio: string
  avatar: string
}

export type Preferences = {
  darkMode: boolean
  highContrast: boolean
  dyslexiaFont: boolean
  notifications: boolean
  emailReminders: boolean
}

export type ActivityValues = Pick<
  Activity,
  'title' | 'subject' | 'kind' | 'dueDate' | 'time' | 'detail' | 'attachments'
>
