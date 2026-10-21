import { useState } from 'react'
import { ActivityList } from '../components/ActivityCard'
import { usePlatform } from '../context/PlatformContext'
import { activityKinds, dateOffset } from '../data/initialActivities'
import { useActivityEditor } from '../hooks/useActivityEditor'

export function CalendarPage() {
  const { activities, toggleActivity } = usePlatform()
  const editor = useActivityEditor()
  const [filter, setFilter] = useState('Todas')
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedDate, setSelectedDate] = useState(dateOffset(1))
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const monthLength = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const days = Array.from({ length: firstWeekday + monthLength }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1))
  const visible = activities.filter((activity) => filter === 'Todas' || activity.kind === filter)
  const dayActivities = visible.filter((activity) => activity.dueDate === selectedDate && activity.status !== 'cancelled')

  function shiftMonth(amount: number) {
    const nextMonth = new Date(year, monthIndex + amount, 1)
    setMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <>
      {editor.message && <div className="platform-success" role="status"><span>✓</span>{editor.message}<button type="button" onClick={editor.clearMessage} aria-label="Fechar aviso">×</button></div>}
      <section className="app-panel agenda-panel">
        <div className="app-panel-heading"><div><span className="eyebrow">CALENDÁRIO ESCOLAR</span><h2>Organize seu mês</h2></div><div className="month-picker"><button type="button" aria-label="Mês anterior" onClick={() => shiftMonth(-1)}>‹</button><span>{monthLabel}</span><button type="button" aria-label="Próximo mês" onClick={() => shiftMonth(1)}>›</button></div></div>
        <div className="calendar-weekdays">{['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{days.map((day, index) => {
          const date = day ? `${yearText}-${monthText}-${String(day).padStart(2, '0')}` : `empty-${index}`
          const hasActivity = day && activities.some((activity) => activity.dueDate === date && activity.status !== 'cancelled')
          return <button key={date} type="button" disabled={!day} className={`${date === selectedDate ? 'day-selected' : ''}${hasActivity ? ' day-has-activity' : ''}`} onClick={() => day && setSelectedDate(date)}>{day}<i /></button>
        })}</div>
        <div className="agenda-day-heading">
          <div><span className="eyebrow">SELEÇÃO</span><h3>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</h3></div>
          <div className="agenda-day-tools">
            <select className="activity-filter" aria-label="Filtrar por tipo" value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todas</option>{activityKinds.map((kind) => <option key={kind}>{kind}</option>)}</select>
            <button className="app-button" type="button" onClick={() => editor.openNew(selectedDate)}><span aria-hidden="true">+</span> Adicionar atividade</button>
          </div>
        </div>
        <ActivityList activities={dayActivities} onToggle={toggleActivity} onEdit={editor.openEdit} onCancel={editor.cancel} emptyMessage="Nenhuma atividade nesta data." />
      </section>
      {editor.form}
    </>
  )
}
