

export function dateOffset(days: number, timeZone='America/Sao_Paulo') {
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const date=new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate()+days)
  return date.toISOString().slice(0,10)
}

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${value}T12:00:00`))
}

export const activityKinds = ['Atividade', 'Prova', 'Evento', 'Aviso'] as const
