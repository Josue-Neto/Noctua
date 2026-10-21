import { usePlatform } from '../context/PlatformContext'

const features = [
  {
    number: '01',
    icon: 'calendar',
    title: 'Tudo no tempo certo',
    description:
      'Atividades, provas e eventos organizados por data para você saber o que vem pela frente.',
  },
  {
    number: '02',
    icon: 'bell',
    title: 'Avisos que chegam',
    description:
      'Comunicados da turma em um só lugar, sem depender de mensagens perdidas pelo caminho.',
  },
  {
    number: '03',
    icon: 'check',
    title: 'Seu ritmo, seu progresso',
    description:
      'Acompanhe suas tarefas com um checklist pessoal, sem alterar a agenda compartilhada.',
  },
] as const

function Icon({ name }: { name: 'arrow' | 'calendar' | 'bell' | 'check' | 'sparkle' | 'sun' | 'moon' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.8 13.1A8.8 8.8 0 0 1 10.9 3.2 9 9 0 1 0 20.8 13.1Z" />,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function PlannerPreview() {
  return (
    <div className="planner-scene" aria-label="Prévia ilustrativa da agenda Noctua">
      <div className="scene-orbit scene-orbit-one" />
      <div className="scene-orbit scene-orbit-two" />
      <div className="floating-note">
        <span className="floating-note-icon"><Icon name="bell" /></span>
        <span><strong>Um lembrete gentil</strong><small>Prova de matemática · amanhã</small></span>
        <span className="note-dot" />
      </div>
      <div className="planner-card">
        <div className="planner-topline">
          <div className="mini-brand">
            <img src="/noctua-logo.png" alt="" />
            <span>Noctua</span>
          </div>
          <span className="class-pill">2º ano · Informática</span>
        </div>
        <div className="planner-greeting">
          <span>QUARTA-FEIRA, 21 DE OUTUBRO</span>
          <h2>Sua semana, mais leve.</h2>
          <p>Um passo de cada vez. Você está no caminho.</p>
        </div>
        <div className="week-strip" aria-hidden="true">
          {[
            ['SEG', '19'],
            ['TER', '20'],
            ['QUA', '21'],
            ['QUI', '22'],
            ['SEX', '23'],
          ].map(([day, date], index) => (
            <div className={index === 2 ? 'selected-day' : ''} key={day}>
              <span>{day}</span><strong>{date}</strong>
              {index === 2 && <i />}
            </div>
          ))}
        </div>
        <div className="planner-list-heading">
          <strong>O que vem por aí</strong>
          <span>Esta semana</span>
        </div>
        <div className="planner-task">
          <span className="task-check"><Icon name="check" /></span>
          <span className="task-copy"><strong>Funções e gráficos</strong><small>Matemática · Prova</small></span>
          <span className="task-date">AMANHÃ</span>
        </div>
        <div className="planner-task">
          <span className="task-check task-check-empty" />
          <span className="task-copy"><strong>Pesquisa de informática</strong><small>Informática · Trabalho</small></span>
          <span className="task-date task-date-warm">SEX, 23</span>
        </div>
        <div className="planner-footer">
          <span><span className="status-dot" /> Tudo organizado</span>
          <span>Ver agenda <Icon name="arrow" /></span>
        </div>
      </div>
      <div className="floating-sticker"><Icon name="sparkle" /><span>Mais clareza.<br />Menos correria.</span></div>
    </div>
  )
}

export function LandingPage({ onAccess }: { onAccess: () => void }) {
  const { preferences, setDarkMode } = usePlatform()
  return (
    <>
    <div className={`site-shell${preferences.darkMode ? ' dark-mode' : ''}`}>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Noctua — início">
          <img src="/noctua-logo.png" alt="" />
          <span>Noctua</span>
        </a>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
        </nav>
        <a className="header-link" href="#acesso" onClick={(event) => { event.preventDefault(); onAccess() }}>
          Acessar plataforma <Icon name="arrow" />
        </a>
      </header>

      <main id="inicio">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-line" /> SUA VIDA ESCOLAR, EM HARMONIA</span>
            <h1>Menos correria.<br />Mais <span>tempo</span><br /><span className="headline-highlight">para aprender.</span></h1>
            <p className="hero-description">
              A agenda escolar que reúne atividades, provas e avisos da sua turma — para você se organizar com mais tranquilidade.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#acesso" onClick={(event) => { event.preventDefault(); onAccess() }}>Conheça o Noctua <Icon name="arrow" /></a>
              <a className="text-link" href="#como-funciona">Descubra como funciona <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-footnote">
              <span className="footnote-avatars" aria-hidden="true"><i>N</i><i>O</i><i>C</i></span>
              <span>Feito para a rotina de estudantes e educadores.</span>
            </div>
          </div>
          <PlannerPreview />
        </section>

        <section className="benefit-band" aria-label="O que o Noctua oferece">
          <div><span className="benefit-icon"><Icon name="calendar" /></span><span><strong>Agenda em um só lugar</strong><small>Atividades, provas e eventos</small></span></div>
          <span className="benefit-divider" aria-hidden="true" />
          <div><span className="benefit-icon benefit-icon-warm"><Icon name="bell" /></span><span><strong>Informação que acompanha você</strong><small>Avisos claros, sem ruído</small></span></div>
          <span className="benefit-divider" aria-hidden="true" />
          <div><span className="benefit-icon benefit-icon-lilac"><Icon name="check" /></span><span><strong>Seu progresso, do seu jeito</strong><small>Uma rotina mais leve</small></span></div>
        </section>

        <section className="features-section section-wrap" id="recursos">
          <div className="section-heading">
            <span className="eyebrow"><span className="eyebrow-line" /> TUDO FICA MAIS SIMPLES</span>
            <h2>Organização que<br />cabe na sua rotina.</h2>
            <p>As informações da escola, reunidas com cuidado para você focar no que está aprendendo.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className={`feature-icon feature-icon-${feature.icon}`}><Icon name={feature.icon} /></div>
                <span className="feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow" aria-hidden="true"><Icon name="arrow" /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <div className="how-inner section-wrap">
            <div className="how-copy">
              <span className="eyebrow"><span className="eyebrow-line" /> CLAREZA DO COMEÇO AO FIM</span>
              <h2>A escola se organiza.<br />Você segue em frente.</h2>
              <p>Professores e coordenação compartilham as informações da turma. Você acompanha os prazos, consulta os detalhes e marca suas tarefas no seu próprio ritmo.</p>
              <a className="text-link" href="#acesso">Um espaço para cada pessoa <span aria-hidden="true">→</span></a>
            </div>
            <div className="steps-card">
              <div className="step-row">
                <span className="step-number">01</span><span className="step-line" />
                <div><strong>A turma compartilha</strong><p>Atividades e comunicados oficiais em um só lugar.</p></div>
              </div>
              <div className="step-row">
                <span className="step-number">02</span><span className="step-line" />
                <div><strong>Você encontra tudo</strong><p>Consulte datas, orientações e materiais da escola.</p></div>
              </div>
              <div className="step-row">
                <span className="step-number">03</span><span className="step-line step-line-last" />
                <div><strong>Avance no seu ritmo</strong><p>Acompanhe suas tarefas sem perder de vista o que vem depois.</p></div>
              </div>
              <div className="steps-note"><Icon name="sparkle" /><span>Uma rotina mais clara começa com uma informação bem cuidada.</span></div>
            </div>
          </div>
        </section>

        <section className="closing-cta section-wrap" id="acesso">
          <div className="cta-mark"><img src="/noctua-logo.png" alt="" /></div>
          <span className="eyebrow">UM NOVO JEITO DE SE ORGANIZAR</span>
          <h2>Tem muita coisa boa<br />pela frente.</h2>
          <p>Atividades, prazos e informações da sua turma em um só lugar.</p>
          <a className="button button-primary landing-access-button" href="#acesso" onClick={(event) => { event.preventDefault(); onAccess() }}>Explorar a plataforma <Icon name="arrow" /></a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand-column">
            <a className="brand footer-brand" href="#inicio">
              <img src="/noctua-logo.png" alt="" />
              <span>Noctua</span>
            </a>
            <p>Mais clareza para a rotina escolar.<br />Mais espaço para aprender.</p>
          </div>
          <div className="footer-links">
            <div><strong>Explore</strong><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a></div>
            <div><strong>O projeto</strong><a href="#inicio">Nossa proposta</a><a href="#acesso">A plataforma</a></div>
          </div>
          <a className="back-to-top" href="#inicio">Voltar ao topo <span aria-hidden="true">↑</span></a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Noctua. Um projeto para uma rotina escolar mais leve.</span>
          <span>Feito com cuidado para quem aprende e ensina.</span>
        </div>
      </footer>
    </div>
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setDarkMode(!preferences.darkMode)}
      aria-label={`Ativar modo ${preferences.darkMode ? 'claro' : 'escuro'}`}
      title={`Ativar modo ${preferences.darkMode ? 'claro' : 'escuro'}`}
    >
      <Icon name={preferences.darkMode ? 'sun' : 'moon'} />
    </button>
    </>
  )
}

export default LandingPage
