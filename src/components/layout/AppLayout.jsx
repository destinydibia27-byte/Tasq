import { Sidebar } from './Sidebar'
import { NotificationBell } from '../ui/NotificationBell'

export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-end px-6 py-3 border-b lg:hidden" style={{ borderColor: 'var(--border)', paddingLeft: 56 }}>
          <NotificationBell />
        </div>
        <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <NotificationBell />
        </div>
        <div className="p-4 lg:p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
