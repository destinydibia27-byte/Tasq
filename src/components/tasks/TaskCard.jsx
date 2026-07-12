import { Calendar, Clock } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import { Avatar } from '../ui/Avatar'
import { formatDeadline, PRIORITY_CONFIG } from '../../lib/utils'
import { format } from 'date-fns'

export function TaskCard({ task, onClick }) {
  const dl = task.deadline ? formatDeadline(task.deadline, task.status) : null
  const priority = PRIORITY_CONFIG[task.priority]
  const assignee = task.profiles

  return (
    <div
      className="card p-4 cursor-pointer transition-all hover:shadow-sm animate-slide-up"
      style={{ borderLeft: `3px solid var(--accent)` }}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium flex-1 leading-snug">{task.title}</h4>
        <StatusBadge status={task.status} />
      </div>

      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-2)' }}>{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignee && (
            <div className="flex items-center gap-1.5">
              <Avatar name={assignee.full_name} src={assignee.avatar_url} size={20} />
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{assignee.full_name?.split(' ')[0]}</span>
            </div>
          )}
          <span className={`text-xs font-medium ${priority?.color}`}>{priority?.label}</span>
        </div>

        {dl && (
          <div className={`flex items-center gap-1 text-xs ${dl.overdue ? 'text-red-500' : dl.urgent ? 'text-orange-500' : dl.approved ? 'text-emerald-500' : dl.submitted ? 'text-blue-400' : dl.rejected ? 'text-amber-500' : ''}`} style={!dl.overdue && !dl.urgent && !dl.approved && !dl.submitted && !dl.rejected ? { color: 'var(--text-3)' } : {}}>
            <Calendar size={11} />
            {dl.text}
          </div>
        )}
      </div>
    </div>
  )
}
