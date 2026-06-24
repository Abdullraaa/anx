import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../lib/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

const phoneToEmail = (phone) => `${phone}@logistics.app`

router.post(
  '/login',
  body('phone').isString().trim().notEmpty(),
  body('password').isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { phone, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    })

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: 'Invalid phone or password' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' })
    }

    res.json({ session: data.session, user: profile })
  },
)

router.post(
  '/register',
  requireAuth,
  requireAdmin,
  body('name').isString().trim().notEmpty(),
  body('phone').isString().trim().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  body('role').isIn(['admin', 'rider']),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { name, phone, password, role } = req.body

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: phoneToEmail(phone),
      password,
      email_confirm: true,
    })

    if (createError || !created?.user) {
      return res.status(400).json({ error: createError?.message || 'Failed to create auth user' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({ id: created.user.id, name, phone, role })
      .select('id, name, phone, role')
      .single()

    if (profileError || !profile) {
      await supabase.auth.admin.deleteUser(created.user.id)
      return res.status(400).json({ error: profileError?.message || 'Failed to create user profile' })
    }

    res.status(201).json({ user: profile })
  },
)

export default router
