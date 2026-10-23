import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { formatDate, dateOffset } from '../data/initialActivities'
import type { UserProfile } from '../types/platform'

export function ProfilePage() {
  const { profile, setProfile, activities } = usePlatform()
  const location = useLocation()
  const [draft, setDraft] = useState(profile)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const published = activities.filter((activity) => activity.status === 'published')
  const completed = published.filter((activity) => activity.done).length
  const progress = published.length ? Math.round((completed / published.length) * 100) : 0
  const nextActivity = published.filter((activity) => !activity.done && activity.dueDate >= dateOffset(0))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.time.localeCompare(b.time))[0]

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

  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem válido.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 4 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') update('avatar', reader.result)
      else setError('Não foi possível carregar a imagem selecionada.')
    }
    reader.onerror = () => setError('Não foi possível carregar a imagem selecionada.')
    reader.readAsDataURL(file)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfile(draft)
    setMessage('Perfil atualizado.')
    setEditing(false)
  }

  function clearAvatar() {
    update('avatar', '')
  }

  return (
    <div className="profile-page">
      {message && <p className="profile-feedback" role="status">{message}</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <section className="app-panel profile-hero">
        <span className="profile-avatar profile-avatar-featured">
          {(editing ? draft.avatar : profile.avatar) ? <img src={editing ? draft.avatar : profile.avatar} alt={`Foto de ${editing ? draft.name : profile.name}`} /> : <Icon name="user" />}
        </span>
        <h2>{profile.name}</h2>
        <p>{profile.email}</p>
        <span className="profile-institution">{profile.institution}</span>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <button className="profile-edit-trigger" type="button" onClick={() => { setEditing((current) => !current); setDraft(profile); setError(''); setMessage('') }} aria-expanded={editing}>
          <span><Icon name="edit" /></span>
          {editing ? 'Fechar edição' : 'Editar perfil'}
        </button>
      </section>

      {!editing && (
        <section className="profile-progress-section" aria-labelledby="profile-progress-title">
          <h2 id="profile-progress-title">Progresso acadêmico</h2>
          <div className="app-panel profile-progress-card">
            <span className="eyebrow">ANÁLISE DE DESEMPENHO</span>
            <div className="profile-progress-list">
              <article>
                <span className="profile-insight-icon"><Icon name="tasks" /></span>
                <div><strong>{completed} {completed === 1 ? 'atividade concluída' : 'atividades concluídas'}</strong><p>Cada etapa finalizada é um passo adiante.</p></div>
              </article>
              <article>
                <span className="profile-insight-icon"><Icon name="calendar" /></span>
                <div><strong>{nextActivity ? `Próximo prazo: ${nextActivity.title}` : 'Tudo em dia por enquanto'}</strong><p>{nextActivity ? `Entrega em ${formatDate(nextActivity.dueDate, { day: 'numeric', month: 'long' })}. Você consegue!` : 'Continue acompanhando sua agenda.'}</p></div>
              </article>
              <article>
                <span className="profile-insight-icon"><Icon name="shield" /></span>
                <div><strong>{progress}% do checklist concluído</strong><p>Seu esforço está construindo um ritmo consistente.</p></div>
              </article>
            </div>
          </div>
        </section>
      )}

      {editing && (
        <section className="app-panel profile-card" aria-labelledby="profile-edit-title">
          <div className="app-panel-heading"><div><span className="eyebrow">SEU ESPAÇO</span><h2 id="profile-edit-title">Personalize seu perfil</h2></div></div>
          <form className="profile-form" onSubmit={submit}>
            <label>Nome completo<input required maxLength={80} autoComplete="name" value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
            <label>E-mail<input required type="email" autoComplete="email" value={draft.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label>Instituição<input maxLength={100} value={draft.institution} onChange={(event) => update('institution', event.target.value)} /></label>
            <div className="form-row">
              <label>Turma<input maxLength={60} value={draft.className} onChange={(event) => update('className', event.target.value)} /></label>
              <label>Curso<input maxLength={80} value={draft.course} onChange={(event) => update('course', event.target.value)} /></label>
            </div>
            <label>Sobre você<textarea rows={3} maxLength={240} value={draft.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Conte um pouco sobre seus estudos." /></label>
            <label>Foto de perfil<input type="file" accept="image/*" onChange={changeAvatar} /><small className="profile-input-help">A imagem será recortada ao centro para caber no formato circular. Até 4 MB.</small></label>
            {draft.avatar && <button className="profile-remove-photo" type="button" onClick={clearAvatar}>Remover foto</button>}
            <div className="profile-form-actions"><button className="app-button app-button-secondary" type="button" onClick={() => { setDraft(profile); setEditing(false); setError(''); setMessage('') }}>Descartar</button><button className="app-button" type="submit">Salvar perfil</button></div>
          </form>
        </section>
      )}
    </div>
  )
}
