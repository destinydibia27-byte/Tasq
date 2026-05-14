import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export function NotificationBell() {
  const { user, acceptInvite } = useAuth()
  const { refetch } = useOrg()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const ref = useRef()

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleAcceptInvite(n) {
    const token = n.link?.split('token=')[1]
    if (!token) return
    setAccepting(n.id)
    const { error } = await acceptInvite(token)
    setAccepting(null)
    if (error) { toast.error('Failed to accept invite'); return }
    await markRead(n.id)
    // Extract org name from notification body for toast
    const orgName = n.title?.replace("You've been invited to ", '') || 'the workspace'
    await refetch()
    toast.success(`Welcome to ${orgName}!`)
  }

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative p-2" onClick={() => { setOpen(!open); if (!open) markAllRead() }}>
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: 'var(--accent)', fontSize: 10 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 card shadow-xl z-50 animate-slide-up overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button className="text-xs" style={{ color: 'var(--accent)' }} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No notifications yet</p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--border)', background: n.read ? 'transparent' : 'var(--accent-light)' }}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{n.body}</p>}
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                {n.type === 'workspace_invite' && n.link && (
                  <button
                    className="btn-primary py-1 px-3 text-xs mt-2"
                    onClick={() => handleAcceptInvite(n)}
                    disabled={accepting === n.id}
                  >
                    {accepting === n.id ? 'Joining...' : 'Accept invite'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
