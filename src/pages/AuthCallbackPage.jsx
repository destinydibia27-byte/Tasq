import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase v2 PKCE: code exchange is async — listen for SIGNED_IN rather than
    // calling getSession() immediately (which returns null before exchange completes).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true })
      }
    })

    // Fallback: if a session already exists (e.g. page refresh), redirect immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 rounded-lg mx-auto mb-4 flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)' }}>T</div>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Signing you in...</p>
      </div>
    </div>
  )
}
