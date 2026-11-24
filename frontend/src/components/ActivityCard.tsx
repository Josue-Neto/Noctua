import type { Activity } from '../types/platform'
import { formatDate } from '../data/initialActivities'
import { Icon } from './Icon'
import { usePlatform } from '../context/PlatformContext'
import { Link } from 'react-router-dom'

export function ActivityCard({
  activity,
  onToggle,
  onEdit,
  onCancel,
  canManage = false,
  canToggle = true,
}: {
  activity: Activity
  onToggle: (id: string) => Promise<void>
  onEdit: (activity: Activity) => void
  onCancel: (activity: Activity) => void
  canManage?: boolean
  canToggle?: boolean
}) {
  const { pending } = usePlatform()
  return (
    <article
      className={`app-activity-card${activity.done ? ' is-complete' : ''}${activity.status === 'cancelled' ? ' is-cancelled' : ''}`}
    >
      {canToggle && activity.status === 'published' && (
        <button
          className="activity-toggle"
          disabled={pending}
          type="button"
          aria-pressed={activity.done}
          aria-label={`${activity.done ? 'Desmarcar' : 'Marcar'} ${activity.title} como concluída`}
          onClick={() => {
            void onToggle(activity.id).catch(() => undefined)
          }}
        >
          {activity.done && <span>✓</span>}
        </button>
      )}
      <div className="app-activity-body">
        <div className="app-activity-title">
          <h3>
            <Link to={`/atividades/${activity.id}`}>{activity.title}</Link>
          </h3>
          <span className={`app-kind kind-${activity.kind.toLowerCase()}`}>
            {activity.kind}
          </span>
        </div>
        <p>{activity.detail}</p>
        {activity.attachments.length > 0 && (
          <div className="activity-attachments">
            {activity.attachments.map((attachment) => (
              <a
                key={attachment.id ?? attachment.url}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="book" />
                {attachment.name}
              </a>
            ))}
          </div>
        )}
        <div className="app-activity-meta">
          <span>
            <Icon name="book" />
            {activity.subject}
          </span>
          <span>{activity.className}</span>
          <span>
            <Icon name="calendar" />
            {formatDate(activity.dueDate, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            · {activity.time}
          </span>
          {activity.status !== 'published' && (
            <span className="status-label">
              {activity.status === 'draft' ? 'Rascunho' : 'Cancelada'}
            </span>
          )}
        </div>
      </div>
      {canManage && activity.status !== 'cancelled' && (
        <div className="activity-actions">
          <button type="button" onClick={() => onEdit(activity)}>
            Editar
          </button>
          <button type="button" onClick={() => onCancel(activity)}>
            Cancelar
          </button>
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
  canManage = false,
  canToggle = true,
}: {
  activities: Activity[]
  onToggle: (id: string) => Promise<void>
  onEdit: (activity: Activity) => void
  onCancel: (activity: Activity) => void
  emptyMessage: string
  canManage?: boolean
  canToggle?: boolean
}) {
  if (!activities.length) return <p className="empty-state">{emptyMessage}</p>
  return (
    <div className="app-activity-list">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onToggle={onToggle}
          onEdit={onEdit}
          onCancel={onCancel}
          canManage={canManage}
          canToggle={canToggle}
        />
      ))}
    </div>
  )
}
