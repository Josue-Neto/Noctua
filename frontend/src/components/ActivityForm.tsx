import { useState, type FormEvent } from 'react'
import { dateOffset, activityKinds } from '../data/initialActivities'
import type { Activity, ActivityStatus, ActivityValues } from '../types/platform'

export function ActivityForm({
  activity,
  initialDate,
  onSave,
  onClose,
}: {
  activity: Activity | null
  initialDate?: string
  onSave: (values: ActivityValues, status: ActivityStatus) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(activity?.title ?? '')
  const [subject, setSubject] = useState(activity?.subject ?? '')
  const [kind, setKind] = useState<Activity['kind']>(activity?.kind ?? 'Atividade')
  const [dueDate, setDueDate] = useState(activity?.dueDate ?? initialDate ?? dateOffset(1))
  const [time, setTime] = useState(activity?.time ?? '23:59')
  const [detail, setDetail] = useState(activity?.detail ?? '')
  const [attachments, setAttachments] = useState(activity?.attachments ?? [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null
    onSave(
      { title, subject, kind, dueDate, time, detail, attachments },
      submitter?.getAttribute('value') === 'draft' ? 'draft' : 'published',
    )
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="activity-modal" role="dialog" aria-modal="true" aria-labelledby="activity-form-title">
        <div className="modal-heading">
          <div><span className="eyebrow">PUBLICAÇÃO PARA A TURMA</span><h2 id="activity-form-title">{activity ? 'Editar atividade' : 'Nova atividade'}</h2></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={submit}>
          <label>Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Seminário de história" /></label>
          <label>Turma<input value="2º ano · Informática" readOnly /></label>
          <div className="form-row">
            <label>Disciplina<input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: História" /></label>
            <label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as Activity['kind'])}>{activityKinds.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="form-row">
            <label>Data<input required type="date" min={activity?.dueDate ?? initialDate ?? dateOffset(0)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <label>Horário<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          </div>
          <label>Orientações<textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Inclua instruções importantes para a turma." /></label>
          <label>Materiais de apoio<input type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files ?? [], (file) => file.name))} /></label>
          {attachments.length > 0 && <p className="attachment-note">Arquivos selecionados: {attachments.join(', ')}</p>}
          <div className="modal-actions">
            <button className="app-button app-button-secondary" type="button" onClick={onClose}>Voltar</button>
            <button className="app-button app-button-secondary" type="submit" name="intent" value="draft">Salvar rascunho</button>
            <button className="app-button" type="submit" name="intent" value="published">{activity ? 'Salvar alterações' : 'Publicar'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
