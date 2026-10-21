import { useState } from 'react'
import { ActivityList } from '../components/ActivityCard'
import { usePlatform } from '../context/PlatformContext'
import { activityKinds } from '../data/initialActivities'
import { useActivityEditor } from '../hooks/useActivityEditor'

export function TasksPage() {
  const { activities, toggleActivity } = usePlatform()
  const [filter, setFilter] = useState('Todas')
  const editor = useActivityEditor()
  const visible = activities.filter((activity) => activity.status === 'published' && (filter === 'Todas' || activity.kind === filter))
  const completed = visible.filter((activity) => activity.done).length
  const progress = visible.length ? (completed / visible.length) * 100 : 0

  return (
    <>
      {editor.message && <div className="platform-success" role="status"><span>✓</span>{editor.message}<button type="button" onClick={editor.clearMessage} aria-label="Fechar aviso">×</button></div>}
      <section className="app-panel tasks-panel">
        <div className="app-panel-heading"><div><span className="eyebrow">CHECKLIST PESSOAL</span><h2>Seu progresso, no seu ritmo</h2></div><select className="activity-filter" aria-label="Filtrar por tipo" value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todas</option>{activityKinds.map((kind) => <option key={kind}>{kind}</option>)}</select></div>
        <div className="task-progress"><div><strong>{completed} de {visible.length}</strong><span>atividades concluídas</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
        <ActivityList activities={visible} onToggle={toggleActivity} onEdit={editor.openEdit} onCancel={editor.cancel} emptyMessage="Nenhuma tarefa corresponde a esse filtro." />
      </section>
      {editor.form}
    </>
  )
}
