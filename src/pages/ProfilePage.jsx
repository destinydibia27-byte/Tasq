import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/ui/Avatar'
import { SKILLS, getSkill } from '../lib/utils'
import { Save, GitBranch, Globe, Bell, BellOff } from 'lucide-react'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/push'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [skill, setSkill] = useState(profile?.skill || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [githubUrl, setGithubUrl] = useState(profile?.github_url || '')
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url || '')
  const [loading, setLoading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(true)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) {
      setPushSupported(false)
      return
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setPushEnabled(!!sub)
    })
  }, [])

  async function handleTogglePush() {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(profile.id)
        setPushEnabled(false)
        toast.success('Notifications turned off')
      } else {
        await subscribeToPush(profile.id)
        setPushEnabled(true)
        toast.success('Notifications turned on')
      }
    } catch (err) {
      toast.error(err.message || 'Could not update notification settings')
    }
    setPushLoading(false)
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await updateProfile({ full_name: fullName, skill, bio, github_url: githubUrl, portfolio_url: portfolioUrl })
    setLoading(false)
    if (error) return toast.error('Failed to save')
    toast.success('Profile updated!')
  }

  const currentSkill = getSkill(skill)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="section-title text-xl">My Profile</h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>How your team sees you</p>
      </div>

      {/* Avatar preview */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile?.full_name} src={profile?.avatar_url} size={56} />
          <div>
            <p className="font-semibold text-base">{profile?.full_name || 'Your name'}</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{profile?.email}</p>
            {skill && (
              <span className="badge mt-1 flex items-center gap-1" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <i className={currentSkill.icon} style={{ fontSize: 11 }} /> {currentSkill.label}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label block mb-1.5">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </div>

          <div>
            <label className="label block mb-1.5">Your role / skill</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SKILLS.map(s => (
                <button
                  key={s.value}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all"
                  style={{
                    borderColor: skill === s.value ? 'var(--accent)' : 'var(--border)',
                    background: skill === s.value ? 'var(--accent-light)' : 'var(--surface)',
                    color: skill === s.value ? 'var(--accent)' : 'var(--text-2)',
                  }}
                  onClick={() => setSkill(s.value)}
                >
                  <i className={s.icon} style={{ fontSize: 20 }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label block mb-1.5">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A little about yourself..." rows={3} style={{ resize: 'none' }} />
          </div>

          <div>
            <label className="label block mb-1.5">
              <GitBranch size={12} style={{ display: 'inline', marginRight: 4 }} />
              GitHub URL
            </label>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourusername" type="url" />
          </div>

          <div>
            <label className="label block mb-1.5">
              <Globe size={12} style={{ display: 'inline', marginRight: 4 }} />
              Portfolio / Website
            </label>
            <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" type="url" />
          </div>

          <button className="btn-primary w-full mt-2" onClick={handleSave} disabled={loading}>
            <Save size={15} />
            {loading ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Push notifications */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {pushEnabled ? <Bell size={18} /> : <BellOff size={18} style={{ color: 'var(--text-2)' }} />}
            <div>
              <p className="font-semibold text-sm">Push notifications</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                {pushSupported
                  ? 'Get notified on this device, even when Tasq is closed.'
                  : 'Not supported in this browser.'}
              </p>
            </div>
          </div>
          {pushSupported && (
            <button
              className={pushEnabled ? 'btn-outline' : 'btn-primary'}
              onClick={handleTogglePush}
              disabled={pushLoading}
            >
              {pushLoading ? '...' : pushEnabled ? 'Turn off' : 'Turn on'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
