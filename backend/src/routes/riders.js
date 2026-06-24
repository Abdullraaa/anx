import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireAdmin)

// ── GET /api/riders ───────────────────────────────────────
// All riders with a count of their currently active jobs
// (status 'assigned' or 'picked_up'). Admin only.
router.get('/riders', async (_req, res) => {
  const { data: riders, error: ridersError } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('role', 'rider')
    .order('name', { ascending: true })

  if (ridersError) {
    return res.status(500).json({ error: 'Failed to load riders' })
  }

  // One query for all active jobs, then tally counts per rider in memory.
  const { data: activeJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('assigned_rider_id')
    .in('status', ['assigned', 'picked_up'])

  if (jobsError) {
    return res.status(500).json({ error: 'Failed to load active jobs' })
  }

  const activeCounts = new Map()
  for (const job of activeJobs) {
    if (!job.assigned_rider_id) continue
    activeCounts.set(job.assigned_rider_id, (activeCounts.get(job.assigned_rider_id) || 0) + 1)
  }

  const result = riders.map((rider) => ({
    ...rider,
    active_jobs: activeCounts.get(rider.id) || 0,
  }))

  res.json({ riders: result })
})

export default router
