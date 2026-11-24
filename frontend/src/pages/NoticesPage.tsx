import { usePlatform } from '../context/PlatformContext'
import { ActivityList } from '../components/ActivityCard'
import { useActivityEditor } from '../hooks/useActivityEditor'
export function NoticesPage() {
  const { activities, authUser, toggleActivity } = usePlatform()
  const editor = useActivityEditor()
  return (
    <section className="app-panel notices-panel">
      <div className="app-panel-heading">
        <div>
          <span className="eyebrow">COMUNICAÇÃO DA TURMA</span>
          <h2>Avisos importantes</h2>
        </div>
      </div>
      <ActivityList
        activities={activities.filter(
          (a) => a.kind === 'Aviso' && a.status === 'published',
        )}
        onToggle={toggleActivity}
        onEdit={editor.openEdit}
        onCancel={editor.cancel}
        canManage={authUser?.role !== 'student'}
        canToggle={authUser?.role === 'student'}
        emptyMessage="Nenhum aviso publicado."
      />
      {editor.form}
    </section>
  )
}
