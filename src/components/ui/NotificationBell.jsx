import { useState, useEffect, useRef } from 'react'
import { Bell, Building2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { Avatar } from './Avatar'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export function NotificationBell() {
  const { user, acceptInvite, declineInvite, pendingInvites } = useAuth()
  const { refetch } = useOrg()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const [declining, setDeclining] = useState(null)
  const ref = useRef()

  const unread = notifications.filter(n => !n.read).length
  const totalBadge = unread + pendingInvites.length

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 50))
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
      .limit(50)
    if (data) setNotifications(data)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function clearAll() {
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  async function handleAcceptInvite(invite) {
    setAccepting(invite.invite_token)
    const { error } = await acceptInvite(invite.invite_token)
    setAccepting(null)
    if (error) { toast.error('Failed to accept invite'); return }
    await refetch(invite.org_id)
    toast.success(`Welcome to ${invite.organizations?.name}!`)
  }

  async function handleDeclineInvite(invite) {
    setDeclining(invite.invite_token)
    await declineInvite(invite.invite_token)
    setDeclining(null)
    toast.success(`Invite to ${invite.organizations?.name} declined`)
  }

  const isEmpty = notifications.length === 0 && pendingInvites.length === 0

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn-ghost relative p-2"
        onClick={() => {
          setOpen(v => !v)
          if (!open) markAllRead()
        }}
      >
        <Bell size={18} />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ background: 'var(--accent)', fontSize: 10 }}>
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-84 card shadow-xl z-50 animate-slide-up overflow-hidden" style={{ width: 340 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button className="text-xs" style={{ color: 'var(--accent)' }} onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {!isEmpty && (
                <button className="btn-ghost p-1" title="Clear all" onClick={clearAll} style={{ color: 'var(--text-3)' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Pending invites */}
            {pendingInvites.map(invite => (
              <div key={invite.id} className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--accent-light)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                    <Building2 size={13} color="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Workspace invite</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                      <strong>{invite.inviter?.full_name || 'Someone'}</strong> invited you to join{' '}
                      <strong>{invite.organizations?.name}</strong>
                    </p>
                    {invite.inviter && (
                      <div className="flex items-center gap-1 mt-1">
                        <Avatar name={invite.inviter.full_name} src={invite.inviter.avatar_url} size={14} />
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{invite.inviter.full_name}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        className="btn-primary py-1 px-3 text-xs"
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={accepting === invite.invite_token}
                      >
                        {accepting === invite.invite_token ? 'Joining...' : 'Accept'}
                      </button>
                      <button
                        className="btn-ghost py-1 px-3 text-xs"
                        onClick={() => handleDeclineInvite(invite)}
                        disabled={declining === invite.invite_token}
                        style={{ color: '#ef4444' }}
                      >
                        {declining === invite.invite_token ? '...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Regular notifications */}
            {isEmpty ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-3)' }}>No notifications</p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className="px-4 py-3 border-b last:border-0"
                style={{ borderColor: 'var(--border)', background: n.read ? 'transparent' : 'var(--accent-light)' }}
              >
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                {n.body && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-2)' }}>{n.body}</p>}
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
