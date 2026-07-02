import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { supabase } from '../lib/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { sendPushNotification } from '../lib/push.js'

const router = Router()

// All job/zone routes require an authenticated user.
router.use(requireAuth)

// ── GET /api/zones ────────────────────────────────────────
// All zones ordered by name.
router.get('/zones', async (_req, res) => {
  const { data, error } = await supabase
    .from('zones')
    .select('id, name, description')
    .order('name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: 'Failed to load zones' })
  }

  res.json({ zones: data })
})

// ── GET /api/zones/pricing?from_zone_id=X&to_zone_id=Y ────
// base_price for a zone combination.
router.get(
  '/zones/pricing',
  query('from_zone_id').isUUID(),
  query('to_zone_id').isUUID(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { from_zone_id, to_zone_id } = req.query

    const { data, error } = await supabase
      .from('zone_pricing')
      .select('base_price, price_per_extra_kg')
      .eq('from_zone_id', from_zone_id)
      .eq('to_zone_id', to_zone_id)
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: 'Failed to load pricing' })
    }

    if (!data) {
      return res.status(404).json({ error: 'No pricing for this zone combination' })
    }

    res.json({ base_price: data.base_price, price_per_extra_kg: data.price_per_extra_kg })
  },
)

// ── POST /api/jobs ────────────────────────────────────────
// Create a delivery job. delivery_fee is derived from zone_pricing.
router.post(
  '/jobs',
  body('pickup_address').isString().trim().notEmpty(),
  body('pickup_zone_id').isUUID(),
  body('dropoff_address').isString().trim().notEmpty(),
  body('dropoff_zone_id').isUUID(),
  body('customer_name').isString().trim().notEmpty(),
  body('customer_phone')
    .trim()
    .notEmpty().withMessage('Customer phone is required')
    .matches(/^[0-9]{7,15}$/).withMessage('Invalid phone number — digits only'),
  body('package_description').optional({ values: 'falsy' }).isString().trim(),
  body('payment_method').isIn(['cash', 'transfer']),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const {
      pickup_address,
      pickup_zone_id,
      dropoff_address,
      dropoff_zone_id,
      customer_name,
      customer_phone,
      package_description,
      payment_method,
    } = req.body

    // Look up the delivery fee for this zone combination.
    const { data: pricing, error: pricingError } = await supabase
      .from('zone_pricing')
      .select('base_price')
      .eq('from_zone_id', pickup_zone_id)
      .eq('to_zone_id', dropoff_zone_id)
      .maybeSingle()

    if (pricingError) {
      return res.status(500).json({ error: 'Failed to load pricing' })
    }

    if (!pricing) {
      return res.status(400).json({ error: 'No pricing for this zone combination' })
    }

    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        created_by: req.user.id,
        pickup_address,
        pickup_zone_id,
        dropoff_address,
        dropoff_zone_id,
        customer_name,
        customer_phone,
        package_description: package_description || null,
        payment_method,
        delivery_fee: pricing.base_price,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insertError || !job) {
      return res.status(400).json({ error: insertError?.message || 'Failed to create job' })
    }

    res.status(201).json({ job })
  },
)

// ── GET /api/jobs ─────────────────────────────────────────
// All jobs, newest first, with zone names and assigned rider details.
// Optional filters: status, date (YYYY-MM-DD).
router.get(
  '/jobs',
  query('status')
    .optional()
    .isIn(['pending', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled']),
  query('date').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    let queryBuilder = supabase
      .from('jobs')
      .select(
        `*,
         pickup_zone:pickup_zone_id (id, name),
         dropoff_zone:dropoff_zone_id (id, name),
         rider:assigned_rider_id (id, name, phone)`,
      )
      .order('created_at', { ascending: false })

    if (req.query.status) {
      queryBuilder = queryBuilder.eq('status', req.query.status)
    }

    if (req.query.date) {
      // Match all jobs created on the given calendar day (UTC).
      const start = `${req.query.date}T00:00:00.000Z`
      const end = `${req.query.date}T23:59:59.999Z`
      queryBuilder = queryBuilder.gte('created_at', start).lte('created_at', end)
    }

    const { data, error } = await queryBuilder

    if (error) {
      return res.status(500).json({ error: 'Failed to load jobs' })
    }

    res.json({ jobs: data })
  },
)

// Re-fetch a job with its embedded zone/rider relations (matches GET /api/jobs shape).
async function fetchJobWithRelations(id) {
  return supabase
    .from('jobs')
    .select(
      `*,
       pickup_zone:pickup_zone_id (id, name),
       dropoff_zone:dropoff_zone_id (id, name),
       rider:assigned_rider_id (id, name, phone)`,
    )
    .eq('id', id)
    .single()
}

// ── PATCH /api/jobs/:id/assign ────────────────────────────
// Assign a pending job to a rider and notify them. Admin only.
router.patch(
  '/jobs/:id/assign',
  requireAdmin,
  param('id').isUUID(),
  body('rider_id').isUUID(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { id } = req.params
    const { rider_id } = req.body

    // Ensure the target user is actually an active rider.
    const { data: rider, error: riderError } = await supabase
      .from('users')
      .select('id, role, expo_push_token, is_active')
      .eq('id', rider_id)
      .maybeSingle()

    if (riderError) {
      return res.status(500).json({ error: 'Failed to load rider' })
    }
    if (!rider || rider.role !== 'rider') {
      return res.status(400).json({ error: 'rider_id does not belong to a rider' })
    }
    if (!rider.is_active) {
      return res.status(400).json({ error: 'Rider is deactivated and cannot be assigned jobs' })
    }

    // Only assign when the job is still pending (guards against double-assignment).
    const { data: updated, error: updateError } = await supabase
      .from('jobs')
      .update({ assigned_rider_id: rider_id, status: 'assigned' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (updateError) {
      return res.status(500).json({ error: 'Failed to assign job' })
    }
    if (!updated) {
      return res.status(409).json({ error: 'Job is not pending or does not exist' })
    }

    const { data: job, error: fetchError } = await fetchJobWithRelations(id)
    if (fetchError || !job) {
      return res.status(500).json({ error: 'Failed to load updated job' })
    }

    // Notify the rider in the background — never block the response on push delivery.
    if (rider.expo_push_token) {
      sendPushNotification({
        to: rider.expo_push_token,
        title: 'New Job Assigned',
        body: `Pickup from ${job.pickup_address} — deliver to ${job.customer_name}`,
        data: { jobId: job.id },
      })
    }

    res.json({ job })
  },
)

// ── PATCH /api/jobs/:id/cancel ────────────────────────────
// Cancel any job that isn't already delivered or failed. Admin only.
router.patch(
  '/jobs/:id/cancel',
  requireAdmin,
  param('id').isUUID(),
  body('cancellation_reason').isString().trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { id } = req.params
    const { cancellation_reason } = req.body

    const { data: updated, error: updateError } = await supabase
      .from('jobs')
      .update({ status: 'cancelled', cancellation_reason })
      .eq('id', id)
      .not('status', 'in', '("delivered","failed")')
      .select('id')
      .maybeSingle()

    if (updateError) {
      return res.status(500).json({ error: 'Failed to cancel job' })
    }
    if (!updated) {
      return res
        .status(409)
        .json({ error: 'Job does not exist or is already delivered/failed' })
    }

    const { data: job, error: fetchError } = await fetchJobWithRelations(id)
    if (fetchError || !job) {
      return res.status(500).json({ error: 'Failed to load updated job' })
    }

    res.json({ job })
  },
)

// ── GET /api/rider/jobs ───────────────────────────────────
// The logged-in rider's active jobs (oldest first).
router.get('/rider/jobs', async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(
      `*,
       pickup_zone:pickup_zone_id (id, name),
       dropoff_zone:dropoff_zone_id (id, name)`,
    )
    .eq('assigned_rider_id', req.user.id)
    .in('status', ['assigned', 'picked_up'])
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ error: 'Failed to load jobs' })
  }

  res.json({ jobs: data })
})

// ── PATCH /api/jobs/:id/status ────────────────────────────
// Rider advances their own job through the delivery lifecycle.
// Legal transitions only:
//   assigned   → picked_up
//   picked_up  → delivered (delivery_photo_url required)
//   picked_up  → failed    (failure_reason required)
router.patch(
  '/jobs/:id/status',
  param('id').isUUID(),
  body('status').isIn(['picked_up', 'delivered', 'failed']),
  body('failure_reason').optional({ values: 'falsy' }).isString().trim(),
  body('delivery_photo_url').optional({ values: 'falsy' }).isString().trim(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { id } = req.params
    const { status, failure_reason, delivery_photo_url } = req.body

    const { data: existing, error: loadError } = await supabase
      .from('jobs')
      .select('id, status, assigned_rider_id')
      .eq('id', id)
      .maybeSingle()

    if (loadError) {
      return res.status(500).json({ error: 'Failed to load job' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' })
    }
    if (existing.assigned_rider_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this job' })
    }

    // Enforce legal transitions and gather required fields.
    const update = { status }
    if (status === 'picked_up') {
      if (existing.status !== 'assigned') {
        return res.status(409).json({ error: 'Job must be assigned to mark as picked up' })
      }
    } else if (status === 'delivered') {
      if (existing.status !== 'picked_up') {
        return res.status(409).json({ error: 'Job must be picked up to mark as delivered' })
      }
      if (!delivery_photo_url) {
        return res.status(400).json({ error: 'A delivery photo is required' })
      }
      update.delivery_photo_url = delivery_photo_url
    } else if (status === 'failed') {
      if (existing.status !== 'picked_up') {
        return res.status(409).json({ error: 'Job must be picked up to mark as failed' })
      }
      if (!failure_reason) {
        return res.status(400).json({ error: 'A failure reason is required' })
      }
      update.failure_reason = failure_reason
    }

    const { error: updateError } = await supabase.from('jobs').update(update).eq('id', id)
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update job status' })
    }

    const { data: job, error: fetchError } = await fetchJobWithRelations(id)
    if (fetchError || !job) {
      return res.status(500).json({ error: 'Failed to load updated job' })
    }

    res.json({ job })
  },
)

// ── PATCH /api/jobs/:id/payment ───────────────────────────
// Rider confirms cash collected for their own cash job.
router.patch(
  '/jobs/:id/payment',
  param('id').isUUID(),
  body('payment_status').isIn(['pending', 'confirmed']),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { id } = req.params
    const { payment_status } = req.body

    const { data: existing, error: loadError } = await supabase
      .from('jobs')
      .select('id, assigned_rider_id, payment_method')
      .eq('id', id)
      .maybeSingle()

    if (loadError) {
      return res.status(500).json({ error: 'Failed to load job' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' })
    }
    if (existing.assigned_rider_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this job' })
    }
    if (existing.payment_method !== 'cash') {
      return res.status(400).json({ error: 'Payment confirmation only applies to cash jobs' })
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ payment_status, cash_remitted: payment_status === 'confirmed' })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update payment' })
    }

    const { data: job, error: fetchError } = await fetchJobWithRelations(id)
    if (fetchError || !job) {
      return res.status(500).json({ error: 'Failed to load updated job' })
    }

    res.json({ job })
  },
)

// ── PATCH /api/rider/push-token ───────────────────────────
// Store the logged-in rider's Expo push token.
router.patch(
  '/rider/push-token',
  body('expo_push_token').isString().trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request', details: errors.array() })
    }

    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: req.body.expo_push_token })
      .eq('id', req.user.id)

    if (error) {
      return res.status(500).json({ error: 'Failed to save push token' })
    }

    res.json({ ok: true })
  },
)

export default router
