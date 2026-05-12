import { useState } from 'react'
import { useOrg } from '../context/OrgContext'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { currentOrg, isAdmin, refetch } = useOrg()
  const [name, setName] = useState(currentOrg?.name || '')
  const [description, setDescription] = useState(currentOrg?.description || '')
  const [loading, setLoading] = useState(false)

  if (!currentOrg || !isAdmin) return (
    <EmptyState icon="⚙️" title="No access" description="You need admin access to view settings." />
  )

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase.from('organizations').update({ name, description }).eq('id', currentOrg.id)
    setLoading(false)
    if (error) return toast.error('Failed to save')
    await refetch()
    toast.success('Settings saved!')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="section-title text-xl">Workspace Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{currentOrg.name}</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label block mb-1.5">Workspace name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={15} />
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="card p-5" style={{ borderColor: '#fca5a5' }}>
        <h2 className="section-title text-sm mb-1 text-red-600">Danger zone</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>These actions are irreversible. Be careful.</p>
        <button className="btn-outline text-red-500 border-red-200" onClick={() => toast.error('Contact support to delete a workspace.')}>
          Delete workspace
        </button>
      </div>
    </div>
  )
}
