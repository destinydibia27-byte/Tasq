import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { getWeekNumber } from '../../lib/utils'
import toast from 'react-hot-toast'

export function CreateTaskModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const { currentOrg, members } = useOrg()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState('medium')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)

  const activeMembers = members.filter(m => m.status === 'active' && m.user_id)

  async function handleCreate() {
    if (!title.trim()) return toast.error('Task title is required')
    if (!assignedTo) return toast.error('Please assign to a team member')
    setLoading(true)

    const { week, year } = getWeekNumber()
    const { error } = await supabase.from('tasks').insert({
      org_id: currentOrg.id,
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo,
      assigned_by: user.id,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      week_number: week,
      week_year: year,
      status: 'assigned',
    })

    setLoading(false)
    if (error) return toast.error(error.message || 'Failed to create task')
    toast.success('Task created!')

    // Notify assignee
    const assignee = activeMembers.find(m => m.user_id === assignedTo)
    if (assignee) {
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        type: 'task_assigned',
        title: 'New task assigned to you',
        body: `"${title}" in ${currentOrg.name}`,
      })
    }

    setTitle(''); setDescription(''); setAssignedTo(''); setPriority('medium'); setDeadline('')
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create task">
      <div className="space-y-4">
        <div>
          <label className="label block mb-1.5">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
        </div>

        <div>
          <label className="label block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more context..." rows={3} style={{ resize: 'none' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1.5">Assign to *</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Select person</option>
              {activeMembers.map(m => (
                <option key={m.id} value={m.user_id}>{m.profiles?.full_name || m.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label block mb-1.5">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label block mb-1.5">Deadline</label>
          <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={loading || !title.trim() || !assignedTo}>
            {loading ? 'Creating...' : 'Create task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
