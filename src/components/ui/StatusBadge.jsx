import { STATUS_CONFIG } from '../../lib/utils'

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.assigned
  return (
    <span className={`badge ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
