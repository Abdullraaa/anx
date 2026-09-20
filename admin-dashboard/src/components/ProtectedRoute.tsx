import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Splash({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-gray-500">{children}</div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, user, loading, logout } = useAuth()

  // Riders can authenticate here — login goes straight to Supabase and knows
  // nothing about roles — so the dashboard has to turn them away itself.
  const rejected = !loading && !!session && !!user && user.role !== 'admin'

  // End the session too: a non-admin left signed in would bounce to /login and
  // be sent straight back by its redirect.
  useEffect(() => {
    if (rejected) logout()
  }, [rejected, logout])

  if (loading) return <Splash>Loading…</Splash>

  if (!session) return <Navigate to="/login" replace />

  // Session is live but the profile is still in flight (onAuthStateChange sets
  // the two separately). Judging the role now would flash a rejection at a
  // legitimate admin.
  if (!user) return <Splash>Loading…</Splash>

  if (user.role !== 'admin') {
    return <Navigate to="/login" replace state={{ error: 'Admin access only' }} />
  }

  return <>{children}</>
}
