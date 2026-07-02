import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { supabase } from '../lib/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireAdmin)

// ── GET /api/riders ───────────────────────────────────────
// All riders with counts of their currently active jobs
// (status 'assigned' or 'picked_up') and total job history. Admin only.
router.get('/riders', async (_req, res) => {
  const { data: riders, error: ridersError } = await supabase
    .from('users')
    .select('id, name, phone, is_active')
    .eq('role', 'rider')
    .order('name', { ascending: true })

  if (ridersError) {
    return res.status(500).json({ error: 'Failed to load riders' })
  }

  // One query for all assigned jobs, then tally counts per rider in memory.
  const { data: assignedJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('assigned_rider_id, status')
    .not('assigned_rider_id', 'is', null)

  if (jobsError) {
    return res.status(500).json({ error: 'Failed to load jobs' })
  }

  const activeCounts = new Map()
  const totalCounts = new Map()
  for (const job of assignedJobs) {
    totalCounts.set(job.assigned_rider_id, (totalCounts.get(job.assigned_rider_id) || 0) + 1)
    if (job.status === 'assigned' || job.status === 'picked_up') {
      activeCounts.set(job.assigned_rider_id, (activeCounts.get(job.assigned_rider_id) || 0) + 1)
    }
  }

  const result = riders.map((rider) => ({
    ...rider,
    active_jobs: activeCounts.get(rider.id) || 0,
    total_jobs: totalCounts.get(rider.id) || 0,
  }))

  res.json({ riders: result })
})

// ── PATCH /api/riders/:id/active ──────────────────────────
// Deactivate or reactivate a rider. Inactive riders keep all history
// but can no longer be assigned jobs. Admin only.
router.patch(
  '/riders/:id/active',
  param('id').isUUID(),
  body('is_active').isBoolean(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { data: rider, error } = await supabase
      .from('users')
      .update({ is_active: req.body.is_active })
      .eq('id', req.params.id)
      .eq('role', 'rider')
      .select('id, name, phone, is_active')
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: 'Failed to update rider' })
    }
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' })
    }

    res.json({ rider })
  },
)

// ── DELETE /api/riders/:id ────────────────────────────────
// Hard-delete a rider, gated: only permitted when the rider has zero
// associated jobs (any status). Riders with any job history must be
// deactivated instead, so their audit trail stays intact. Admin only.
router.delete('/riders/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request', details: errors.array() })
  }

  const { id } = req.params

  const { data: rider, error: riderError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', id)
    .maybeSingle()

  if (riderError) {
    return res.status(500).json({ error: 'Failed to load rider' })
  }
  if (!rider || rider.role !== 'rider') {
    return res.status(404).json({ error: 'Rider not found' })
  }

  const { count, error: countError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_rider_id', id)

  if (countError) {
    return res.status(500).json({ error: 'Failed to check rider job history' })
  }
  if (count > 0) {
    return res
      .status(409)
      .json({ error: 'Rider has job history and cannot be deleted — deactivate instead' })
  }

  // Location pings are transient tracking data, not history — safe to clear
  // so the FK doesn't block the profile delete.
  const { error: locationError } = await supabase
    .from('rider_locations')
    .delete()
    .eq('rider_id', id)

  if (locationError) {
    return res.status(500).json({ error: 'Failed to delete rider' })
  }

  const { error: deleteError } = await supabase.from('users').delete().eq('id', id)

  if (deleteError) {
    // FK violation: some other record (e.g. a payout) still references the rider.
    if (deleteError.code === '23503') {
      return res
        .status(409)
        .json({ error: 'Rider has linked records and cannot be deleted — deactivate instead' })
    }
    return res.status(500).json({ error: 'Failed to delete rider' })
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(id)
  if (authError) {
    return res
      .status(500)
      .json({ error: 'Rider profile deleted, but removing the login account failed' })
  }

  res.json({ ok: true })
})

export default router
