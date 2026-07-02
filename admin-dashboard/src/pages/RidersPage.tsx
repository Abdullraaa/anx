import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'

type Rider = {
  id: string
  name: string
  phone: string
  is_active: boolean
  active_jobs: number
  total_jobs: number
}

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/api/riders')
      .then((res) => {
        if (!cancelled) setRiders(res.data.riders)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load riders')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const resetForm = () => {
    setName('')
    setPhone('')
    setPassword('')
    setFormError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await api.post('/api/auth/register', {
        name: name.trim(),
        phone: phone.trim(),
        password,
        role: 'rider',
      })
      // Surface the new rider immediately — register returns the user without counts.
      setRiders((prev) =>
        [...prev, { ...res.data.user, is_active: true, active_jobs: 0, total_jobs: 0 }].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      )
      resetForm()
      setShowForm(false)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to add rider'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (rider: Rider) => {
    setActionError(null)
    setBusyId(rider.id)
    try {
      const res = await api.patch(`/api/riders/${rider.id}/active`, {
        is_active: !rider.is_active,
      })
      setRiders((prev) =>
        prev.map((r) => (r.id === rider.id ? { ...r, is_active: res.data.rider.is_active } : r)),
      )
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update rider'
      setActionError(message)
    } finally {
      setBusyId(null)
    }
  }

  const deleteRider = async (rider: Rider) => {
    if (!window.confirm(`Delete rider ${rider.name}? This cannot be undone.`)) return
    setActionError(null)
    setBusyId(rider.id)
    try {
      await api.delete(`/api/riders/${rider.id}`)
      setRiders((prev) => prev.filter((r) => r.id !== rider.id))
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to delete rider'
      setActionError(message)
    } finally {
      setBusyId(null)
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Riders</h1>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add rider
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading riders…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {actionError && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}

      {!loading && !error && riders.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">No riders yet.</p>
      )}

      {!loading && !error && riders.length > 0 && (
        <div className="mt-6 space-y-3">
          {riders.map((rider) => (
            <div
              key={rider.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
                rider.is_active ? '' : 'opacity-70'
              }`}
            >
              <div>
                <div className="font-medium text-gray-900">{rider.name}</div>
                <div className="text-sm text-gray-500">{rider.phone}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!rider.is_active && (
                  <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    inactive
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {rider.active_jobs} active
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(rider)}
                  disabled={busyId === rider.id}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rider.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteRider(rider)}
                  disabled={busyId === rider.id || rider.total_jobs > 0}
                  title={
                    rider.total_jobs > 0
                      ? 'Riders with job history cannot be deleted — deactivate instead'
                      : undefined
                  }
                  className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add rider modal */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Add rider</h2>
            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="rider_name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="rider_name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="rider_phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  id="rider_phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{7,15}"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="rider_password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="rider_password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Adding…' : 'Add rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
