import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

type JobStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'failed'
  | 'cancelled'

type Job = {
  id: string
  customer_name: string
  customer_phone: string
  delivery_fee: number | null
  payment_method: 'cash' | 'transfer' | null
  status: JobStatus
  created_at: string
  pickup_zone: { id: string; name: string } | null
  dropoff_zone: { id: string; name: string } | null
  rider: { id: string; name: string; phone: string } | null
}

type Rider = {
  id: string
  name: string
  phone: string
  is_active: boolean
  active_jobs: number
}

type FilterTab = 'all' | 'pending' | 'active' | 'completed'

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
]

const activeStatuses: JobStatus[] = ['assigned', 'picked_up']
const completedStatuses: JobStatus[] = ['delivered', 'failed', 'cancelled']

// Jobs that can no longer be cancelled.
const finalStatuses: JobStatus[] = ['delivered', 'failed']

// Brand colours carry the in-flight pipeline; green/red stay on the terminal
// outcomes so delivered vs failed remains scannable at a glance.
const statusStyles: Record<JobStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  assigned: 'bg-anx-navy/10 text-anx-navy',
  picked_up: 'bg-anx-orange/15 text-anx-orange-ink',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-600',
}

const statusLabel = (status: JobStatus) => status.replace('_', ' ')

const formatNaira = (amount: number | null) =>
  amount === null
    ? '—'
    : new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(amount)

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {statusLabel(status)}
    </span>
  )
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')

  // The job currently targeted by the assign / cancel modal (null = closed).
  const [assignTarget, setAssignTarget] = useState<Job | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([api.get('/api/jobs'), api.get('/api/riders')])
      .then(([jobsRes, ridersRes]) => {
        if (cancelled) return
        setJobs(jobsRes.data.jobs)
        setRiders(ridersRes.data.riders)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load jobs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'all') return jobs
    if (tab === 'pending') return jobs.filter((j) => j.status === 'pending')
    if (tab === 'active') return jobs.filter((j) => activeStatuses.includes(j.status))
    return jobs.filter((j) => completedStatuses.includes(j.status))
  }, [jobs, tab])

  // Replace a single job in place so the row updates without a reload.
  const replaceJob = (updated: Job) =>
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))

  function JobActions({ job }: { job: Job }) {
    const canCancel = !finalStatuses.includes(job.status) && job.status !== 'cancelled'
    if (job.status !== 'pending' && !canCancel) return null
    return (
      <div className="flex flex-wrap gap-2">
        {job.status === 'pending' && (
          <button
            type="button"
            onClick={() => setAssignTarget(job)}
            className="rounded-md bg-anx-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-anx-navy-700"
          >
            Assign rider
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelTarget(job)}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-anx-navy">Jobs</h1>
        <Link
          to="/jobs/new"
          className="rounded-md bg-anx-navy px-4 py-2 text-sm font-medium text-white hover:bg-anx-navy-700"
        >
          Create job
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === t.key
                ? 'bg-anx-navy text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading jobs…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">No jobs to show.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Dropoff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Rider</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((job) => (
                  <tr key={job.id} className="text-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{job.customer_name}</div>
                      <div className="text-xs text-gray-500">{job.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3">{job.pickup_zone?.name ?? '—'}</td>
                    <td className="px-4 py-3">{job.dropoff_zone?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3">{formatNaira(job.delivery_fee)}</td>
                    <td className="px-4 py-3 capitalize">{job.payment_method ?? '—'}</td>
                    <td className="px-4 py-3">
                      {job.rider ? (
                        <div>
                          <div className="text-gray-900">{job.rider.name}</div>
                          <div className="text-xs text-gray-500">{job.rider.phone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {formatTime(job.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <JobActions job={job} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{job.customer_name}</div>
                    <div className="text-xs text-gray-500">{job.customer_phone}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <span className="text-gray-500">Route: </span>
                  {job.pickup_zone?.name ?? '—'} → {job.dropoff_zone?.name ?? '—'}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
                  <span>
                    <span className="text-gray-500">Fee: </span>
                    {formatNaira(job.delivery_fee)}
                  </span>
                  <span className="capitalize">
                    <span className="text-gray-500">Payment: </span>
                    {job.payment_method ?? '—'}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    <span className="text-gray-500">Rider: </span>
                    {job.rider ? job.rider.name : 'Unassigned'}
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(job.created_at)}</span>
                </div>

                <div className="mt-3">
                  <JobActions job={job} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {assignTarget && (
        <AssignModal
          job={assignTarget}
          riders={riders}
          onClose={() => setAssignTarget(null)}
          onAssigned={(updated) => {
            replaceJob(updated)
            setAssignTarget(null)
          }}
        />
      )}

      {cancelTarget && (
        <CancelModal
          job={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={(updated) => {
            replaceJob(updated)
            setCancelTarget(null)
          }}
        />
      )}
    </div>
  )
}

const apiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">{children}</div>
    </div>
  )
}

function AssignModal({
  job,
  riders,
  onClose,
  onAssigned,
}: {
  job: Job
  riders: Rider[]
  onClose: () => void
  onAssigned: (job: Job) => void
}) {
  const [riderId, setRiderId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    if (!riderId) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.patch(`/api/jobs/${job.id}/assign`, { rider_id: riderId })
      onAssigned(res.data.job)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to assign rider'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell>
      <h2 className="text-lg font-extrabold text-anx-navy">Assign rider</h2>
      <p className="mt-1 text-sm text-gray-500">
        Job for {job.customer_name} · {job.pickup_zone?.name ?? '—'} →{' '}
        {job.dropoff_zone?.name ?? '—'}
      </p>

      <label htmlFor="assign_rider" className="mt-4 block text-sm font-medium text-gray-700">
        Rider
      </label>
      <select
        id="assign_rider"
        value={riderId}
        onChange={(e) => setRiderId(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-anx-orange focus:outline-none focus:ring-1 focus:ring-anx-orange"
      >
        <option value="">Select rider…</option>
        {riders
          .filter((r) => r.is_active)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.active_jobs} active)
            </option>
          ))}
      </select>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!riderId || submitting}
          className="rounded-md bg-anx-navy px-4 py-2 text-sm font-medium text-white hover:bg-anx-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Assigning…' : 'Confirm'}
        </button>
      </div>
    </ModalShell>
  )
}

function CancelModal({
  job,
  onClose,
  onCancelled,
}: {
  job: Job
  onClose: () => void
  onCancelled: (job: Job) => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.patch(`/api/jobs/${job.id}/cancel`, {
        cancellation_reason: reason.trim(),
      })
      onCancelled(res.data.job)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to cancel job'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell>
      <form onSubmit={confirm}>
        <h2 className="text-lg font-extrabold text-anx-navy">Cancel job</h2>
        <p className="mt-1 text-sm text-gray-500">
          Cancelling the job for {job.customer_name}. This can't be undone.
        </p>

        <label htmlFor="cancel_reason" className="mt-4 block text-sm font-medium text-gray-700">
          Reason
        </label>
        <textarea
          id="cancel_reason"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-anx-orange focus:outline-none focus:ring-1 focus:ring-anx-orange"
        />

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Keep job
          </button>
          <button
            type="submit"
            disabled={!reason.trim() || submitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Cancelling…' : 'Cancel job'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
