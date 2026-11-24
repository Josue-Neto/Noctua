import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePlatform } from '../context/PlatformContext'
import { ApiError } from '../lib/api'
import { Icon } from '../components/Icon'

export function ActivityDetailPage() {
  const { id = '' } = useParams()
  const {
    activities,
    authUser,
    schoolTimezone,
    getActivity,
    toggleActivity,
    pending,
  } = usePlatform()
  const [loadedId, setLoadedId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const activity = activities.find((item) => item.id === id)

  useEffect(() => {
    let active = true
    setLoadedId('')
    setError('')
    setMessage('')
    setNotFound(false)
    getActivity(id)
      .then(() => {
        if (active) setLoadedId(id)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setNotFound(
          cause instanceof ApiError &&
            (cause.status === 400 || cause.status === 404),
        )
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar a atividade.',
        )
      })
    return () => {
      active = false
    }
  }, [id, authUser?.id, attempt, getActivity])

  useEffect(() => {
    if (loadedId === id) heading.current?.focus()
  }, [loadedId, id])

  async function toggle() {
    setError('')
    setMessage('')
    try {
      const wasDone = activity?.done
      await toggleActivity(id)
      setMessage(
        wasDone
          ? 'Atividade desmarcada no seu checklist.'
          : 'Atividade concluída no seu checklist.',
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar seu checklist.',
      )
    }
  }

  return (
    <section className="app-panel activity-detail">
      <Link className="app-link-button" to="/agenda">
        <Icon name="back" /> Voltar à agenda
      </Link>
      {error && (
        <div className="auth-error" role="alert">
          {notFound
            ? 'Atividade indisponível. Ela pode não estar publicada ou não pertencer às suas turmas.'
            : error}
          {loadedId !== id && !notFound && (
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {!error && loadedId !== id && (
        <p role="status">Carregando detalhes da atividade…</p>
      )}
      {loadedId === id && activity && (
        <>
          <span className="eyebrow">
            {activity.kind} ·{' '}
            {activity.status === 'draft'
              ? 'Rascunho'
              : activity.status === 'cancelled'
                ? 'Cancelada'
                : 'Publicada'}
          </span>
          <h2 ref={heading} tabIndex={-1}>
            {activity.title}
          </h2>
          <dl className="activity-detail-meta">
            <div>
              <dt>Turma</dt>
              <dd>{activity.className}</dd>
            </div>
            <div>
              <dt>Disciplina</dt>
              <dd>{activity.subject}</dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd>
                <time dateTime={activity.dueAt}>
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    timeZone: schoolTimezone,
                  }).format(new Date(activity.dueAt))}
                </time>
                <small>{schoolTimezone}</small>
              </dd>
            </div>
            <div>
              <dt>Publicado por</dt>
              <dd>{activity.authorName}</dd>
            </div>
          </dl>
          <h3>Orientações</h3>
          <p className="activity-detail-description">
            {activity.detail || 'Nenhuma orientação adicional.'}
          </p>
          <h3>Materiais de apoio</h3>
          {activity.attachments.length ? (
            <ul className="activity-detail-materials">
              {activity.attachments.map((attachment) => (
                <li key={attachment.id ?? attachment.url}>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attachment.name}
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum material anexado.</p>
          )}
          {authUser?.role === 'student' && activity.status === 'published' && (
            <div className="activity-detail-checklist">
              <h3>Meu checklist</h3>
              <p>
                Esta marcação é individual e mantém o prazo oficial da turma.
              </p>
              <button
                className="app-button"
                type="button"
                disabled={pending}
                aria-pressed={activity.done}
                onClick={() => {
                  void toggle()
                }}
              >
                {pending
                  ? 'Salvando…'
                  : activity.done
                    ? 'Desmarcar como concluída'
                    : 'Marcar como concluída'}
              </button>
            </div>
          )}
          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  )
}
