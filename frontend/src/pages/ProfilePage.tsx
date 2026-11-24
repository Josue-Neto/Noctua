import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { formatDate, dateOffset } from '../data/initialActivities'
import type { UserProfile } from '../types/platform'

export function ProfilePage() {
  const { profile, setProfile, activities, pending, schoolTimezone } =
    usePlatform()
  const location = useLocation()
  const [draft, setDraft] = useState(profile)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const published = activities.filter(
    (activity) => activity.status === 'published',
  )
  const completed = published.filter((activity) => activity.done).length
  const progress = published.length
    ? Math.round((completed / published.length) * 100)
    : 0
  const nextActivity = published
    .filter(
      (activity) =>
        !activity.done && activity.dueDate >= dateOffset(0, schoolTimezone),
    )
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) || a.time.localeCompare(b.time),
    )[0]

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  useEffect(() => {
    if (location.state?.editProfile) {
      setDraft(profile)
      setEditing(true)
    }
  }, [location.key, location.state])

  function update(key: keyof UserProfile, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await setProfile(draft)
      setMessage('Perfil atualizado.')
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar.')
    }
  }
  function clearAvatar() {
    update('avatar', '')
  }

  return (
    <div className="profile-page">
      {message && (
        <p className="profile-feedback" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="profile-error" role="alert">
          {error}
        </p>
      )}
      <section className="app-panel profile-hero">
        <span className="profile-avatar profile-avatar-featured">
          {(editing ? draft.avatar : profile.avatar) ? (
            <img
              src={editing ? draft.avatar : profile.avatar}
              alt={`Foto de ${editing ? draft.name : profile.name}`}
            />
          ) : (
            <Icon name="user" />
          )}
        </span>
        <h2>{profile.name}</h2>
        <p>{profile.email}</p>
        <span className="profile-institution">{profile.institution}</span>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <button
          className="profile-edit-trigger"
          type="button"
          disabled={pending}
          onClick={() => {
            setEditing((current) => !current)
            setDraft(profile)
            setError('')
            setMessage('')
          }}
          aria-expanded={editing}
        >
          <span>
            <Icon name="edit" />
          </span>
          {editing ? 'Fechar edição' : 'Editar perfil'}
        </button>
      </section>

      {!editing && (
        <section
          className="profile-progress-section"
          aria-labelledby="profile-progress-title"
        >
          <h2 id="profile-progress-title">Progresso acadêmico</h2>
          <div className="app-panel profile-progress-card">
            <span className="eyebrow">ANÁLISE DE DESEMPENHO</span>
            <div className="profile-progress-list">
              <article>
                <span className="profile-insight-icon">
                  <Icon name="tasks" />
                </span>
                <div>
                  <strong>
                    {completed}{' '}
                    {completed === 1
                      ? 'atividade concluída'
                      : 'atividades concluídas'}
                  </strong>
                  <p>Cada etapa finalizada é um passo adiante.</p>
                </div>
              </article>
              <article>
                <span className="profile-insight-icon">
                  <Icon name="calendar" />
                </span>
                <div>
                  <strong>
                    {nextActivity
                      ? `Próximo prazo: ${nextActivity.title}`
                      : 'Tudo em dia por enquanto'}
                  </strong>
                  <p>
                    {nextActivity
                      ? `Entrega em ${formatDate(nextActivity.dueDate, { day: 'numeric', month: 'long' })}. Você consegue!`
                      : 'Continue acompanhando sua agenda.'}
                  </p>
                </div>
              </article>
              <article>
                <span className="profile-insight-icon">
                  <Icon name="shield" />
                </span>
                <div>
                  <strong>{progress}% do checklist concluído</strong>
                  <p>Seu esforço está construindo um ritmo consistente.</p>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {editing && (
        <section
          className="app-panel profile-card"
          aria-labelledby="profile-edit-title"
        >
          <div className="app-panel-heading">
            <div>
              <span className="eyebrow">SEU ESPAÇO</span>
              <h2 id="profile-edit-title">Personalize seu perfil</h2>
            </div>
          </div>
          <form className="profile-form" onSubmit={submit}>
            <label>
              Nome completo
              <input
                required
                maxLength={80}
                disabled={pending}
                autoComplete="name"
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </label>
            <label>
              E-mail
              <input
                required
                type="email"
                autoComplete="email"
                value={draft.email}
                readOnly
              />
            </label>
            <label>
              Instituição
              <input maxLength={100} value={draft.institution} readOnly />
            </label>
            <div className="form-row">
              <label>
                Turma
                <input maxLength={60} value={draft.className} readOnly />
              </label>
              <label>
                Curso
                <input maxLength={80} value={draft.course} readOnly />
              </label>
            </div>
            <label>
              Sobre você
              <textarea
                rows={3}
                disabled={pending}
                maxLength={240}
                value={draft.bio}
                onChange={(event) => update('bio', event.target.value)}
                placeholder="Conte um pouco sobre seus estudos."
              />
            </label>
            <label>
              Foto de perfil
              <input
                type="url"
                disabled={pending}
                pattern="https://.*"
                value={draft.avatar}
                onChange={(event) => update('avatar', event.target.value)}
                placeholder="https://..."
              />
              <small className="profile-input-help">
                A imagem será recortada ao centro para caber no formato
                circular. Use um link HTTPS.
              </small>
            </label>
            {draft.avatar && (
              <button
                className="profile-remove-photo"
                type="button"
                disabled={pending}
                onClick={clearAvatar}
              >
                Remover foto
              </button>
            )}
            <div className="profile-form-actions">
              <button
                className="app-button app-button-secondary"
                type="button"
                disabled={pending}
                onClick={() => {
                  setDraft(profile)
                  setEditing(false)
                  setError('')
                  setMessage('')
                }}
              >
                Descartar
              </button>
              <button className="app-button" type="submit" disabled={pending}>
                {pending ? 'Salvando…' : 'Salvar perfil'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
