export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-4xl mb-4 opacity-60">{icon}</div>
      <h3 className="section-title text-base mb-2">{title}</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-2)' }}>{description}</p>
      {action}
    </div>
  )
}
