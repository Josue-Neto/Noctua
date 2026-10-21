import { Link } from 'react-router-dom'
import { ActivityList } from '../components/ActivityCard'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { dateOffset, formatDate } from '../data/initialActivities'
import { useActivityEditor } from '../hooks/useActivityEditor'

export function DashboardPage() {
  const { activities, profile, toggleActivity } = usePlatform()
  const editor = useActivityEditor()
  const published = activities.filter((activity) => activity.status === 'published')
  const pending = published.filter((activity) => !activity.done).length
  const completed = published.filter((activity) => activity.done).length
  const nextDue = [...published].filter((activity) => activity.dueDate >= dateOffset(0)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const today = formatDate(dateOffset(0), { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      {editor.message && <div className="platform-success" role="status"><span>✓</span>{editor.message}<button type="button" onClick={editor.clearMessage} aria-label="Fechar aviso">×</button></div>}
      <section className="dashboard-welcome">
        <div><span className="eyebrow">{today.toLocaleUpperCase('pt-BR')}</span><h2>Olá, {profile.name.split(' ')[0]}.</h2><p>Acompanhe os próximos passos da sua rotina escolar.</p></div>
        <button className="app-button" type="button" onClick={() => editor.openNew()}><Icon name="plus" /> Adicionar atividade</button>
      </section>
      <div className="overview-cards">
        <article><span className="overview-icon"><Icon name="tasks" /></span><span><small>Pendentes</small><strong>{pending}</strong><em>na agenda da turma</em></span></article>
        <article><span className="overview-icon"><Icon name="calendar" /></span><span><small>Próximo prazo</small><strong className="overview-date">{nextDue ? formatDate(nextDue.dueDate) : 'Sem prazos'}</strong><em>{nextDue ? `${nextDue.subject} · ${nextDue.time}` : 'Tudo em dia'}</em></span></article>
        <article><span className="overview-icon"><Icon name="tasks" /></span><span><small>Concluídas</small><strong>{completed}</strong><em>marcadas no checklist</em></span></article>
      </div>
      <div className="dashboard-grid">
        <section className="app-panel">
          <div className="app-panel-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h2>Próximas atividades</h2></div><Link className="app-link-button" to="/agenda">Ver agenda <Icon name="arrow" /></Link></div>
          <ActivityList activities={published.filter((activity) => activity.status === 'published').slice(0, 4)} onToggle={toggleActivity} onEdit={editor.openEdit} onCancel={editor.cancel} emptyMessage="Nenhuma atividade publicada ainda." />
        </section>
        <aside className="app-panel week-panel-app">
          <div className="app-panel-heading"><div><span className="eyebrow">LEMBRETE</span><h2>Um passo por vez</h2></div><span className="panel-sparkle">✦</span></div>
          <p>Atividades, avisos e prazos da sua turma reunidos para facilitar a rotina.</p>
          {nextDue && <div className="tip-highlight"><Icon name="bell" /><span><strong>Próximo prazo</strong><small>{nextDue.title} · {formatDate(nextDue.dueDate)}</small></span></div>}
          <Link className="app-link-button" to="/configuracoes">Preferências de avisos <Icon name="arrow" /></Link>
        </aside>
      </div>
      {editor.form}
    </>
  )
}
