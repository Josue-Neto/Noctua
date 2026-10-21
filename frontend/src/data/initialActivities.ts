import type { Activity } from '../types/platform'

export function dateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${value}T12:00:00`))
}

export const initialActivities: Activity[] = [
  {
    id: 1,
    title: 'Pesquisa sobre segurança na internet',
    subject: 'Informática',
    kind: 'Atividade',
    dueDate: dateOffset(1),
    time: '23:59',
    detail: 'Prepare uma pesquisa breve sobre segurança digital e inclua as fontes consultadas.',
    attachments: [],
    done: false,
    status: 'published',
  },
  {
    id: 2,
    title: 'Avaliação: funções e gráficos',
    subject: 'Matemática',
    kind: 'Prova',
    dueDate: dateOffset(2),
    time: '10:00',
    detail: 'Conteúdo: funções do primeiro e segundo grau e interpretação de gráficos.',
    attachments: [],
    done: false,
    status: 'published',
  },
  {
    id: 3,
    title: 'Leitura do capítulo 4',
    subject: 'Língua Portuguesa',
    kind: 'Atividade',
    dueDate: dateOffset(4),
    time: '23:59',
    detail: 'Leitura individual para a próxima roda de conversa.',
    attachments: [],
    done: true,
    status: 'published',
  },
  {
    id: 4,
    title: 'Feira de projetos da turma',
    subject: 'Coordenação',
    kind: 'Evento',
    dueDate: dateOffset(6),
    time: '14:00',
    detail: 'Encontro no pátio principal. Traga seu crachá escolar.',
    attachments: [],
    done: false,
    status: 'published',
  },
]

export const activityKinds = ['Atividade', 'Prova', 'Evento', 'Aviso'] as const

export const initialProfile = {
  name: 'Pedro Amorim',
  email: 'pedro@aluno.cps.sp.gov.br',
  institution: 'ETEC Antônio Furlan',
  className: '2º ano',
  course: 'Informática',
  bio: 'Organizando meus estudos, um passo de cada vez.',
  avatar: '',
}
