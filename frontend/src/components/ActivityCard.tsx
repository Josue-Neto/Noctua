import type { Activity } from '../types/platform'
import { formatDate } from '../data/initialActivities'
import { Icon } from './Icon'

export function ActivityCard({
  activity,
  onToggle,
  onEdit,
  onCancel,
}: {
  activity: Activity
  onToggle: (id: number) => void
  onEdit: (activity: Activity) => void
  onCancel: (activity: Activity) => void
}) {
  return (
    <article className={`app-activity-card${activity.done ? ' is-complete' : ''}${activity.status === 'cancelled' ? ' is-cancelled' : ''}`}>
      {activity.status === 'published' && (
        <button className="activity-toggle" type="button" aria-pressed={activity.done} aria-label={`${activity.done ? 'Desmarcar' : 'Marcar'} ${activity.title} como concluída`} onClick={() => onToggle(activity.id)}>
          {activity.done && <span>✓</span>}
        </button>
      )}
      <div className="app-activity-body">
        <div className="app-activity-title">
          <h3>{activity.title}</h3>
          <span className={`app-kind kind-${activity.kind.toLowerCase()}`}>{activity.kind}</span>
        </div>
        <p>{activity.detail}</p>
        {activity.attachments.length > 0 && (
          <div className="activity-attachments">
            {activity.attachments.map((attachment) => <span key={attachment}><Icon name="book" />{attachment}</span>)}
          </div>
        )}
        <div className="app-activity-meta">
          <span><Icon name="book" />{activity.subject}</span>
          <span><Icon name="calendar" />{formatDate(activity.dueDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {activity.time}</span>
          {activity.status !== 'published' && <span className="status-label">{activity.status === 'draft' ? 'Rascunho' : 'Cancelada'}</span>}
        </div>
      </div>
      {activity.status !== 'cancelled' && (
        <div className="activity-actions">
          <button type="button" onClick={() => onEdit(activity)}>Editar</button>
          <button type="button" onClick={() => onCancel(activity)}>Cancelar</button>
        </div>
      )}
    </article>
  )
}

export function ActivityList({
  activities,
  onToggle,
  onEdit,
  onCancel,
  emptyMessage,
}: {
  activities: Activity[]
  onToggle: (id: number) => void
  onEdit: (activity: Activity) => void
  onCancel: (activity: Activity) => void
  emptyMessage: string
}) {
  if (!activities.length) return <p className="empty-state">{emptyMessage}</p>
  return (
    <div className="app-activity-list">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} onToggle={onToggle} onEdit={onEdit} onCancel={onCancel} />
      ))}
    </div>
  )
}
