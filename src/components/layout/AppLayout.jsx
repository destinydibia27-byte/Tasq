import { Sidebar } from './Sidebar'
import { NotificationBell } from '../ui/NotificationBell'

export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div
          className="sticky top-0 z-30 flex items-center justify-end pl-14 lg:pl-6 pr-6 py-3 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', backdropFilter: 'blur(8px)' }}
        >
          <NotificationBell />
        </div>
        <div className="p-4 lg:p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
