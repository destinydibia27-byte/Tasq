import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useOrg } from '../../context/OrgContext'
import toast from 'react-hot-toast'

export function CreateOrgModal({ open, onClose }) {
  const { createOrg } = useOrg()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return toast.error('Workspace name is required')
    setLoading(true)
    const { data, error } = await createOrg(name.trim(), description.trim())
    setLoading(false)
    if (error) return toast.error(error.message || 'Failed to create workspace')
    toast.success(`"${name}" workspace created!`)
    onClose()
    setName('')
    setDescription('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Create workspace">
      <div className="space-y-4">
        <div>
          <label className="label block mb-1.5">Workspace name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Design Team"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <div>
          <label className="label block mb-1.5">Description <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does your team do?"
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
