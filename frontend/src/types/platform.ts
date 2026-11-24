export type ActivityKind = 'Atividade' | 'Prova' | 'Evento' | 'Aviso'
export type ActivityStatus = 'published' | 'draft' | 'cancelled'

export type Activity = {
  id: string
  classSubjectId: string
  classId: string
  className: string
  subjectId: string
  authorName: string
  dueAt: string
  title: string
  subject: string
  kind: ActivityKind
  dueDate: string
  time: string
  detail: string
  attachments: Attachment[]
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

export type UserRole = 'student' | 'teacher' | 'coordinator'

export type AuthUser = {
  id: string
  fullName: string
  email: string
  role: UserRole
  classes: Array<{ id: string; name: string; schoolYear: number }>
  subjects: Array<{
    id: string
    name: string
    classId: string
    className: string
  }>
}

export type Preferences = {
  theme: 'system' | 'light' | 'dark'
  darkMode: boolean
  highContrast: boolean
  dyslexiaFont: boolean
  notifications: boolean
  emailReminders: boolean
  pushEnabled: boolean
  remind24Hours: boolean
  remind48Hours: boolean
}

export type Attachment = { id?: string; name: string; url: string }
export type ClassSlot = {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

export type ActivityValues = Pick<
  Activity,
  | 'title'
  | 'classSubjectId'
  | 'kind'
  | 'dueDate'
  | 'time'
  | 'detail'
  | 'attachments'
>
