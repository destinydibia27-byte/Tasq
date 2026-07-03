import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const OrgContext = createContext({})

export function OrgProvider({ children }) {
  const { user, profile } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)
  const currentOrgRef = useRef(null)

  useEffect(() => {
    if (user) fetchOrgs()
    else { setOrgs([]); setCurrentOrg(null); setMembers([]); setLoading(false) }
  }, [user])

  // Keep ref in sync so realtime callback always has latest org
  useEffect(() => {
    currentOrgRef.current = currentOrg
    if (currentOrg) {
      fetchMembers(currentOrg.id)
      localStorage.setItem('teamer-last-org', currentOrg.id)
    }
  }, [currentOrg])

  // Global realtime: keep members fresh on every page, not just TeamPage
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`org-members-global:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'org_members' }, (payload) => {
        const orgId = payload.new?.org_id || payload.old?.org_id
        if (orgId && orgId === currentOrgRef.current?.id) {
          fetchMembers(orgId)
        }
        // If user's own membership changed (e.g. they were removed), refetch orgs
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchOrgs()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function fetchOrgs(selectOrgId = null) {
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

      // selectOrgId takes priority (e.g. after accepting invite)
      const targetId = selectOrgId || localStorage.getItem('teamer-last-org')
      const target = orgsData.find(o => o.id === targetId)
      const selected = target || orgsData[0] || null
      setCurrentOrg(selected)
      if (selected) {
        const role = data.find(d => d.org_id === selected.id)?.role
        setMyRole(role)
      }
    }
    setLoading(false)
  }

  async function fetchMembers(orgId) {
    const { data, error } = await supabase
      .from('org_members')
      .select('*, profiles!org_members_user_id_fkey(*)')
      .eq('org_id', orgId)
      .neq('status', 'removed')
    if (error) console.error('[fetchMembers] error:', error.message)
    if (data) setMembers(data)
    const me = data?.find(m => m.user_id === user?.id)
    if (me) setMyRole(me.role)
  }

  async function createOrg(name, description) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36)
    const { data: org, error } = await supabase
      .rpc('create_organization', { p_name: name, p_slug: slug, p_description: description || '' })
    if (error) return { error }
    await fetchOrgs(org.id)
    return { data: org }
  }

  async function inviteMember(email) {
    if (!currentOrg) return { error: 'No org selected' }

    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id, status, invite_token')
      .eq('org_id', currentOrg.id)
      .eq('email', email)
      .single()

    if (existingMember?.status === 'active') {
      return { error: { code: '23505', message: 'This person is already in your workspace.' } }
    }
    if (existingMember?.status === 'invited') {
      return { data: existingMember, userExists: false, resent: true }
    }
    if (existingMember?.status === 'removed') {
      // Previously declined or removed — re-invite them
      const { data: updated, error } = await supabase
        .from('org_members')
        .update({ status: 'invited', invited_by: user.id, user_id: null })
        .eq('id', existingMember.id)
        .select()
        .single()
      if (error) return { error }
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).single()
      if (existingProfile?.id) {
        await supabase.from('notifications').insert({
          user_id: existingProfile.id,
          type: 'workspace_invite',
          title: `You've been invited to ${currentOrg.name}`,
          body: `Accept the invite to join ${currentOrg.name} on Teamer.`,
          link: `/invite?token=${updated.invite_token}`,
        })
      }
     
    // Send invite email (non-blocking – don't fail invite if email fails)
    supabase.functions.invoke('send-invite-email', {
      body: {
        email,
        orgName: currentOrg.name,
        inviterName: profile?.full_name || 'Someone',
        inviteToken: updated.invite_token,
      },
    }).then(res => console.log('invite email result:', res))
  .catch(err => console.error('invite email error:', err))

      await fetchMembers(currentOrg.id)
      return { data: updated, userExists: !!existingProfile }
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    const { data, error } = await supabase
      .from('org_members')
      .insert({ org_id: currentOrg.id, email, invited_by: user.id, status: 'invited', user_id: existingProfile?.id || null })
      .select()
      .single()
    if (error) return { error }

    if (existingProfile?.id) {
      await supabase.from('notifications').insert({
        user_id: existingProfile.id,
        type: 'workspace_invite',
        title: `You've been invited to ${currentOrg.name}`,
        body: `Accept the invite to join ${currentOrg.name} on Teamer.`,
        link: `/invite?token=${data.invite_token}`,
      })
    }

    // Send invite email (non-blocking — don't fail invite if email fails)
    supabase.functions.invoke('send-invite-email', {
      body: {
        email,
        orgName: currentOrg.name,
        inviterName: profile?.full_name || 'Someone',
        inviteToken: data.invite_token,
      },
    }).catch(() => {})

    await fetchMembers(currentOrg.id)
    return { data, userExists: !!existingProfile }
  }

  async function shareOwnership(memberId) {
    await supabase.from('org_members').update({ role: 'admin' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function removeMember(memberId) {
    await supabase.from('org_members').update({ status: 'removed' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function revokeInvite(memberId) {
    await supabase.from('org_members').update({ status: 'removed' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function updateMemberSkill(profileId, skill) {
    await supabase.from('profiles').update({ skill }).eq('id', profileId)
    await fetchMembers(currentOrg.id)
  }

  async function leaveOrg() {
    if (!currentOrg) return { error: 'No org selected' }
    if (myRole === 'owner') return { error: 'Owners cannot leave. Transfer ownership first or delete the workspace.' }
    const { error } = await supabase
      .from('org_members')
      .update({ status: 'removed' })
      .eq('org_id', currentOrg.id)
      .eq('user_id', user.id)
    if (error) return { error }
    localStorage.removeItem('teamer-last-org')
    setCurrentOrg(null)
    setMembers([])
    setMyRole(null)
    await fetchOrgs()
    return {}
  }

  async function deleteOrg() {
    if (!currentOrg) return { error: 'No org selected' }
    const { error } = await supabase.from('organizations').delete().eq('id', currentOrg.id)
    if (error) return { error }
    setCurrentOrg(null)
    setOrgs([])
    setMembers([])
    localStorage.removeItem('teamer-last-org')
    await fetchOrgs()
    return {}
  }

  const isAdmin = myRole === 'owner' || myRole === 'admin'

  return (
    <OrgContext.Provider value={{
      orgs, currentOrg, setCurrentOrg, members, loading, myRole, isAdmin,
      createOrg, inviteMember, shareOwnership, removeMember, deleteOrg, leaveOrg,
      refetch: (selectOrgId) => fetchOrgs(selectOrgId),
      refetchMembers: () => currentOrg && fetchMembers(currentOrg.id),
      revokeInvite, updateMemberSkill,
    }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
