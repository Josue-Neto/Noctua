import { useState } from 'react'

type Activity = {
  id: number
  title: string
  subject: string
  type: 'Trabalho' | 'Prova' | 'Evento'
  daysUntil: number
  time: string
  done: boolean
}

type View = 'overview' | 'agenda' | 'tasks' | 'notifications'

const initialActivities: Activity[] = [
  {
    id: 1,
    title: 'Pesquisa sobre segurança na internet',
    subject: 'Informática',
    type: 'Trabalho',
    daysUntil: 1,
    time: '23:59',
    done: false,
  },
  {
    id: 2,
    title: 'Avaliação: funções e gráficos',
    subject: 'Matemática',
    type: 'Prova',
    daysUntil: 2,
    time: '10:00',
    done: false,
  },
  {
    id: 3,
    title: 'Leitura do capítulo 4',
    subject: 'Língua Portuguesa',
    type: 'Trabalho',
    daysUntil: 4,
    time: '23:59',
    done: true,
  },
]

const navigation: { id: View; label: string; shortLabel: string }[] = [
  { id: 'overview', label: 'Visão geral', shortLabel: 'Início' },
  { id: 'agenda', label: 'Agenda', shortLabel: 'Agenda' },
  { id: 'tasks', label: 'Minhas tarefas', shortLabel: 'Tarefas' },
  { id: 'notifications', label: 'Notificações', shortLabel: 'Avisos' },
]

function formatDate(daysFromToday: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function dueLabel(daysUntil: number) {
  if (daysUntil === 0) return 'Vence hoje'
  if (daysUntil === 1) return 'Vence amanhã'
  return `Em ${daysUntil} dias`
}

function App() {
  const [activeView, setActiveView] = useState<View>('overview')
  const [activities, setActivities] = useState(initialActivities)
  const [highContrast, setHighContrast] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
  const pendingCount = activities.filter((activity) => !activity.done).length

  function toggleActivity(id: number) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id ? { ...activity, done: !activity.done } : activity,
      ),
    )
  }

  const heading =
    activeView === 'agenda'
      ? 'Sua agenda'
      : activeView === 'tasks'
        ? 'Minhas tarefas'
        : activeView === 'notifications'
          ? 'Notificações'
          : 'Visão geral'

  return (
    <div className={`app-shell${highContrast ? ' contrast-mode' : ''}`}>
      <aside className="sidebar" aria-label="Navegação principal">
        <a className="brand" href="#inicio" onClick={() => setActiveView('overview')}>
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>Noctua</span>
        </a>

        <p className="nav-caption">MENU</p>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-link${activeView === item.id ? ' active' : ''}`}
              type="button"
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-indicator" aria-hidden="true" />
              {item.label}
              {item.id === 'notifications' && (
                <span className="nav-count" aria-label="2 avisos não lidos">2</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-avatar" aria-hidden="true">A</div>
          <div className="profile-copy">
            <strong>Estudante</strong>
            <span>Minha conta</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div>
            <p className="eyebrow">AGENDA ESCOLAR</p>
            <h1>{heading}</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="contrast-toggle"
              type="button"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((value) => !value)}
            >
              <span aria-hidden="true">◐</span>
              {highContrast ? 'Contraste padrão' : 'Alto contraste'}
            </button>
            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Abrir notificações"
              onClick={() => setActiveView('notifications')}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span className="notification-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row" aria-labelledby="welcome-title">
            <div>
              <p className="eyebrow">SUA ROTINA, EM UM SÓ LUGAR</p>
              <h2 id="welcome-title">Oi! Vamos organizar a semana?</h2>
              <p className="muted-copy">
                Acompanhe atividades, provas e avisos importantes da sua turma.
              </p>
            </div>
            <div className="week-date">
              <span className="date-icon" aria-hidden="true">▦</span>
              <span>{formatDate(0)}</span>
            </div>
          </section>

          <section className="summary-grid" aria-label="Resumo da semana">
            <article className="summary-card">
              <span className="summary-icon purple-icon" aria-hidden="true">▤</span>
              <div>
                <span className="summary-label">Pendentes</span>
                <strong>{pendingCount}</strong>
                <span className="summary-hint">na sua lista</span>
              </div>
            </article>
            <article className="summary-card">
              <span className="summary-icon yellow-icon" aria-hidden="true">◷</span>
              <div>
                <span className="summary-label">Próximo prazo</span>
                <strong>{formatDate(1)}</strong>
                <span className="summary-hint">Informática · 23:59</span>
              </div>
            </article>
            <article className="summary-card">
              <span className="summary-icon lavender-icon" aria-hidden="true">✓</span>
              <div>
                <span className="summary-label">Concluídas</span>
                <strong>{activities.filter((activity) => activity.done).length}</strong>
                <span className="summary-hint">marcadas por você</span>
              </div>
            </article>
          </section>

          <div className="content-grid">
            <section className="panel activities-panel" aria-labelledby="activities-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">NÃO DEIXE PARA DEPOIS</p>
                  <h2 id="activities-title">
                    {activeView === 'notifications'
                      ? 'Avisos da sua turma'
                      : activeView === 'agenda'
                        ? 'Próximas atividades'
                        : 'Sua lista de atividades'}
                  </h2>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setActiveView(activeView === 'tasks' ? 'overview' : 'tasks')}
                >
                  {activeView === 'tasks' ? 'Visão geral' : 'Ver todas'}
                  <span aria-hidden="true"> →</span>
                </button>
              </div>

              {activeView === 'notifications' && (
                <div className="notice-banner" role="status">
                  Lembretes de prazo aparecem aqui quando as notificações estiverem ativadas.
                </div>
              )}

              <ul className="activity-list">
                {activities.map((activity) => (
                  <li className={`activity-item${activity.done ? ' completed' : ''}`} key={activity.id}>
                    <button
                      className="check-button"
                      type="button"
                      aria-label={`${activity.done ? 'Desmarcar' : 'Marcar'} ${activity.title} como concluída`}
                      aria-pressed={activity.done}
                      onClick={() => toggleActivity(activity.id)}
                    >
                      {activity.done ? '✓' : ''}
                    </button>
                    <div className="activity-copy">
                      <div className="activity-title-row">
                        <h3>{activity.title}</h3>
                        <span className={`type-badge ${activity.type.toLowerCase()}`}>
                          {activity.type}
                        </span>
                      </div>
                      <div className="activity-meta">
                        <span className="subject-dot" aria-hidden="true" />
                        <span>{activity.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(activity.daysUntil)}</span>
                      </div>
                    </div>
                    <div className={`due-badge${activity.daysUntil <= 1 && !activity.done ? ' urgent' : ''}`}>
                      {activity.done ? 'Concluída' : dueLabel(activity.daysUntil)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="panel week-panel" aria-labelledby="week-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">FIQUE POR DENTRO</p>
                  <h2 id="week-title">Esta semana</h2>
                </div>
                <span className="calendar-icon" aria-hidden="true">▦</span>
              </div>
              <p className="week-intro">Seus próximos compromissos, sem surpresas.</p>
              <ol className="week-list">
                {activities.slice(0, 3).map((activity) => (
                  <li key={activity.id}>
                    <span className="week-marker" aria-hidden="true" />
                    <div>
                      <strong>{formatDate(activity.daysUntil)}</strong>
                      <span>{activity.subject} · {activity.type}</span>
                    </div>
                    <time>{activity.time}</time>
                  </li>
                ))}
              </ol>
              <div className="tip-card">
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>Uma coisa de cada vez</strong>
                  <p>Marque uma tarefa quando terminar. Seu checklist é só seu.</p>
                </div>
              </div>
            </aside>
          </div>

          <p className="demo-note">
            Prévia com dados de demonstração · API ainda não conectada
            {' '}(<code>{apiUrl}</code>)
          </p>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-link${activeView === item.id ? ' active' : ''}`}
            type="button"
            aria-current={activeView === item.id ? 'page' : undefined}
            onClick={() => setActiveView(item.id)}
          >
            <span aria-hidden="true">{item.id === 'overview' ? '⌂' : item.id === 'agenda' ? '▦' : item.id === 'tasks' ? '☷' : '!'}</span>
            {item.shortLabel}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
