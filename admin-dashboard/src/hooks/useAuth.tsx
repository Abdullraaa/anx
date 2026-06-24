import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserProfile = {
  id: string
  name: string
  phone: string
  role: 'admin' | 'rider'
}

type AuthContextValue = {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const phoneToEmail = (phone: string) => `${phone}@logistics.app`

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as UserProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        setUser(await fetchProfile(data.session.user.id))
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted) return
      setSession(next)
      setUser(next?.user ? await fetchProfile(next.user.id) : null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    })
    if (error) throw new Error('Invalid phone or password')
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
