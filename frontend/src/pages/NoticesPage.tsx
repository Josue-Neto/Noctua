import { Icon } from '../components/Icon'
import { formatDate, dateOffset } from '../data/initialActivities'

const announcements = [
  {
    title: 'Atualização na agenda da semana',
    category: 'Comunicado',
    icon: 'bell',
    body: `A prova de matemática está marcada para ${formatDate(dateOffset(2))}, às 10h. Confira os conteúdos indicados pela disciplina.`,
    author: 'Coordenação',
    age: 'Hoje',
  },
  {
    title: 'Feira de projetos se aproximando',
    category: 'Lembrete',
    icon: 'calendar',
    body: 'Separe os materiais necessários e confira as orientações compartilhadas para a turma.',
    author: 'Coordenação',
    age: 'Ontem',
  },
]

export function NoticesPage() {
  return (
    <section className="app-panel notices-panel">
      <div className="app-panel-heading"><div><span className="eyebrow">COMUNICAÇÃO DA TURMA</span><h2>Avisos importantes</h2></div></div>
      <div className="notice-list">{announcements.map((notice) => (
        <article key={notice.title}>
          <span className="notice-icon notice-icon-warm"><Icon name={notice.icon} /></span>
          <div><span className="app-kind">{notice.category}</span><h3>{notice.title}</h3><p>{notice.body}</p><small>{notice.author} · {notice.age}</small></div>
        </article>
      ))}</div>
    </section>
  )
}
