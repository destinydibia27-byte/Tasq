import { useState } from 'react'
import { useOrg } from '../context/OrgContext'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { getSkill } from '../lib/utils'
import { UserPlus, Shield, Trash2, Clock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function TeamPage() {
  const { currentOrg, members, isAdmin, inviteMember, shareOwnership, removeMember, myRole } = useOrg()
  const { user } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) return toast.error('Invalid email address')
    setLoading(true)
    const { data, error, userExists } = await inviteMember(inviteEmail.trim().toLowerCase())
    setLoading(false)
    if (error) {
      if (error.code === '23505') return toast.error('This person is already in your workspace.')
      return toast.error(error.message || 'Failed to send invite')
    }
    if (!userExists) {
      toast(`${inviteEmail} isn't on Teamer yet. Invite sent — they'll get an email to join!`, { icon: '📧', duration: 5000 })
    } else {
      toast.success(`Invite sent to ${inviteEmail}!`)
    }
    setInviteEmail('')
  }

  async function handleShareOwnership(memberId) {
    if (!confirm('Give this person admin access?')) return
    await shareOwnership(memberId)
    toast.success('Admin access granted')
  }

  async function handleRemove(memberId) {
    if (!confirm('Remove this person from the workspace?')) return
    await removeMember(memberId)
    toast.success('Member removed')
  }

  if (!currentOrg) return <EmptyState icon="👥" title="No workspace" description="Create a workspace to manage your team." />

  const active = members.filter(m => m.status === 'active')
  const invited = members.filter(m => m.status === 'invited')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="section-title text-xl">Team</h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{active.length} active member{active.length !== 1 ? 's' : ''} · {invited.length} pending invite{invited.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Invite */}
      {isAdmin && (
        <div className="card p-5">
          <h2 className="section-title text-sm mb-3">Invite someone</h2>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Enter email address..."
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
              <UserPlus size={15} />
              {loading ? 'Inviting...' : 'Invite'}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            If they're not on Teamer yet, they'll receive an email invite with a link to join.
          </p>
        </div>
      )}

      {/* Active members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-sm">Active members</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No active members yet.</p>
          </div>
        ) : (
          <div>
            {active.map((m, i) => {
              const skill = getSkill(m.profiles?.skill)
              const isMe = m.user_id === user?.id
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 transition-colors hover:opacity-90" style={{ borderColor: 'var(--border)' }}>
                  <Avatar name={m.profiles?.full_name || m.email} src={m.profiles?.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.profiles?.full_name || m.email}</p>
                      {isMe && <span className="badge text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>You</span>}
                      {m.role !== 'member' && (
                        <span className="badge text-xs" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {m.role === 'owner' ? '👑 owner' : '🛡️ admin'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{skill.icon} {skill.label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{m.email}</span>
                    </div>
                  </div>
                  {isAdmin && !isMe && (
                    <div className="flex items-center gap-1">
                      {m.role === 'member' && myRole === 'owner' && (
                        <button className="btn-ghost p-1.5 text-xs" title="Make admin" onClick={() => handleShareOwnership(m.id)}>
                          <Shield size={15} />
                        </button>
                      )}
                      <button className="btn-ghost p-1.5" title="Remove" onClick={() => handleRemove(m.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {invited.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="section-title text-sm">Pending invites</h2>
          </div>
          {invited.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <Mail size={16} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm">{m.email}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Invited {format(new Date(m.created_at), 'MMM d, yyyy')}</p>
              </div>
              <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                <Clock size={10} /> Pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
