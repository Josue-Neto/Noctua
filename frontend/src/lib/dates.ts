export function dateParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    dueDate: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}
export function schoolInstant(date: string, time: string, timeZone: string) {
  const target = Date.parse(`${date}T${time}:00Z`)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const local = dateParts(new Date(guess).toISOString(), timeZone)
    const observed = Date.parse(`${local.dueDate}T${local.time}:00Z`)
    guess += target - observed
  }
  const check = dateParts(new Date(guess).toISOString(), timeZone)
  if (check.dueDate !== date || check.time !== time)
    throw new Error('Este horário não existe no fuso escolar.')
  return new Date(guess).toISOString()
}
