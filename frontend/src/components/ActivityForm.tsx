import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePlatform } from '../context/PlatformContext'
import { dateOffset, activityKinds } from '../data/initialActivities'
import type {
  Activity,
  ActivityStatus,
  ActivityValues,
} from '../types/platform'

export function ActivityForm({
  activity,
  initialDate,
  onSave,
  onClose,
}: {
  activity: Activity | null
  initialDate?: string
  onSave: (values: ActivityValues, status: ActivityStatus) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(activity?.title ?? '')
  const { catalog, schoolTimezone } = usePlatform()
  const [classSubjectId, setClassSubjectId] = useState(
    activity?.classSubjectId ?? catalog[0]?.id ?? '',
  )
  const [kind, setKind] = useState<Activity['kind']>(
    activity?.kind ?? 'Atividade',
  )
  const [dueDate, setDueDate] = useState(
    activity?.dueDate ?? initialDate ?? dateOffset(1, schoolTimezone),
  )
  const [time, setTime] = useState(activity?.time ?? '23:59')
  const [detail, setDetail] = useState(activity?.detail ?? '')
  const [attachments, setAttachments] = useState(activity?.attachments ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const modal = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    modal.current?.querySelector('input')?.focus()
    return () => previous?.focus()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter =
      event.nativeEvent instanceof SubmitEvent
        ? event.nativeEvent.submitter
        : null
    setBusy(true)
    setError('')
    try {
      await onSave(
        { title, classSubjectId, kind, dueDate, time, detail, attachments },
        submitter?.getAttribute('value') === 'published'
          ? 'published'
          : activity?.status === 'published' ? 'published' : 'draft',
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={modal}
        className="activity-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-form-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose()
          if (event.key === 'Tab') {
            const targets = Array.from(
              modal.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,textarea',
              ) ?? [],
            )
            const first = targets[0],
              last = targets[targets.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PUBLICAÇÃO PARA A TURMA</span>
            <h2 id="activity-form-title">
              {activity ? 'Editar atividade' : 'Nova atividade'}
            </h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Título
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Seminário de história"
            />
          </label>
          <label>
            Turma e disciplina
            <select
              required
              value={classSubjectId}
              onChange={(event) => setClassSubjectId(event.target.value)}
            >
              <option value="">Selecione</option>
              {catalog.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.className} · {slot.subjectName}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Tipo
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as Activity['kind'])
                }
              >
                {activityKinds.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Data
              <input
                required
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
            <label>
              Horário
              <input
                required
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
          <label>
            Orientações
            <textarea
              rows={4}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="Inclua instruções importantes para a turma."
            />
          </label>
          <p className="attachment-note">Horário escolar: {schoolTimezone}</p>
          <fieldset className="activity-links">
            <legend>Materiais de apoio</legend>
            {attachments.map((link, index) => (
              <div key={index}>
                <label>
                  Nome do material
                  <input
                    required
                    maxLength={100}
                    value={link.name}
                    onChange={(event) =>
                      setAttachments((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Link HTTPS
                  <input
                    required
                    type="url"
                    pattern="https://.*"
                    value={link.url}
                    onChange={(event) =>
                      setAttachments((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remover material {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={attachments.length >= 20}
              onClick={() =>
                setAttachments((current) => [...current, { name: '', url: '' }])
              }
            >
              Adicionar link
            </button>
          </fieldset>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="app-button app-button-secondary"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Voltar
            </button>
            {activity?.status !== 'published' && <button
              className="app-button app-button-secondary"
              type="submit"
              disabled={busy || !catalog.length}
              name="intent"
              value="draft"
            >
              Salvar rascunho
            </button>}
            <button
              className="app-button"
              type="submit"
              disabled={busy || !catalog.length}
              name="intent"
              value="published"
            >
              {busy ? 'Salvando…' : activity?.status === 'published' ? 'Salvar alterações' : 'Publicar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
