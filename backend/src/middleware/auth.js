import { supabase } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' })
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, phone, role, is_active')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found' })
  }

  // Deactivated accounts keep a valid Supabase session, so the block has to
  // happen here — otherwise they reach every route behind requireAuth.
  if (profile.is_active === false) {
    return res.status(403).json({ error: 'Account deactivated' })
  }

  req.user = profile
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
