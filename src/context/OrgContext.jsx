import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const OrgContext = createContext({})

export function OrgProvider({ children }) {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)

  useEffect(() => {
    if (user) fetchOrgs()
    else { setOrgs([]); setCurrentOrg(null); setLoading(false) }
  }, [user])

  useEffect(() => {
    if (currentOrg) {
      fetchMembers(currentOrg.id)
      localStorage.setItem('teamer-last-org', currentOrg.id)
    }
  }, [currentOrg])

  async function fetchOrgs() {
    setLoading(true)
    const { data } = await supabase
      .from('org_members')
      .select('org_id, role, status, organizations(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
    
    if (data) {
      const orgsData = data
        .filter(d => d.organizations?.id)
        .map(d => ({ ...d.organizations, myRole: d.role }))
      setOrgs(orgsData)
      const lastId = localStorage.getItem('teamer-last-org')
      const last = orgsData.find(o => o.id === lastId)
      setCurrentOrg(last || orgsData[0] || null)
      if (last || orgsData[0]) {
        const role = data.find(d => d.org_id === (last?.id || orgsData[0]?.id))?.role
        setMyRole(role)
      }
    }
    setLoading(false)
  }

  async function fetchMembers(orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('*, profiles(*)')
      .eq('org_id', orgId)
      .neq('status', 'removed')
    if (data) setMembers(data)
    const me = data?.find(m => m.user_id === user?.id)
    if (me) setMyRole(me.role)
  }

  async function createOrg(name, description) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36)
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, slug, description, owner_id: user.id })
      .select()
      .single()
    if (error) return { error }
    await supabase.from('org_members').insert({
      org_id: org.id,
      user_id: user.id,
      email: user.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString()
    })
    await fetchOrgs()
    return { data: org }
  }

  async function inviteMember(email) {
    if (!currentOrg) return { error: 'No org selected' }
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    const { data, error } = await supabase
      .from('org_members')
      .insert({ org_id: currentOrg.id, email, invited_by: user.id, status: 'invited', user_id: existing?.id || null })
      .select()
      .single()
    if (error) return { error }
    // In production, trigger Supabase Edge Function to send invite email
    // supabase.functions.invoke('send-invite', { body: { email, token: data.invite_token, orgName: currentOrg.name } })
    await fetchMembers(currentOrg.id)
    return { data, userExists: !!existing }
  }

  async function shareOwnership(memberId) {
    await supabase.from('org_members').update({ role: 'admin' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function removeMember(memberId) {
    await supabase.from('org_members').update({ status: 'removed' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  const isAdmin = myRole === 'owner' || myRole === 'admin'

  return (
    <OrgContext.Provider value={{ orgs, currentOrg, setCurrentOrg, members, loading, myRole, isAdmin, createOrg, inviteMember, shareOwnership, removeMember, refetch: fetchOrgs, refetchMembers: () => fetchMembers(currentOrg?.id) }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
