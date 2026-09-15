import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type Zone = { id: string; name: string }

type PaymentMethod = 'cash' | 'transfer'

const emptyForm = {
  pickup_address: '',
  pickup_zone_id: '',
  dropoff_address: '',
  dropoff_zone_id: '',
  customer_name: '',
  customer_phone: '',
  package_description: '',
  payment_method: 'cash' as PaymentMethod,
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)

export default function CreateJobPage() {
  const navigate = useNavigate()
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState(emptyForm)
  const [fee, setFee] = useState<number | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api
      .get('/api/zones')
      .then((res) => setZones(res.data.zones))
      .catch(() => setError('Failed to load zones'))
  }, [])

  // Auto-fetch the delivery fee whenever both zones are chosen.
  useEffect(() => {
    if (!form.pickup_zone_id || !form.dropoff_zone_id) {
      setFee(null)
      setFeeError(null)
      return
    }

    let cancelled = false
    setFeeLoading(true)
    setFeeError(null)
    api
      .get('/api/zones/pricing', {
        params: { from_zone_id: form.pickup_zone_id, to_zone_id: form.dropoff_zone_id },
      })
      .then((res) => {
        if (!cancelled) setFee(res.data.base_price)
      })
      .catch(() => {
        if (!cancelled) {
          setFee(null)
          setFeeError('No price found for this zone combination')
        }
      })
      .finally(() => {
        if (!cancelled) setFeeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [form.pickup_zone_id, form.dropoff_zone_id])

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await api.post('/api/jobs', {
        pickup_address: form.pickup_address.trim(),
        pickup_zone_id: form.pickup_zone_id,
        dropoff_address: form.dropoff_address.trim(),
        dropoff_zone_id: form.dropoff_zone_id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        package_description: form.package_description.trim() || undefined,
        payment_method: form.payment_method,
      })
      setSuccess(true)
      setForm(emptyForm)
      setFee(null)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to create job'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-anx-orange focus:outline-none focus:ring-1 focus:ring-anx-orange'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-extrabold text-anx-navy">Create job</h1>
      <p className="mt-1 text-sm text-gray-500">
        Delivery fee is calculated automatically from the selected zones.
      </p>

      {success && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>Job created successfully.</span>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="font-medium underline"
          >
            View jobs
          </button>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pickup_address" className="block text-sm font-medium text-gray-700">
              Pickup address
            </label>
            <input
              id="pickup_address"
              type="text"
              required
              value={form.pickup_address}
              onChange={(e) => update('pickup_address', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pickup_zone_id" className="block text-sm font-medium text-gray-700">
              Pickup zone
            </label>
            <select
              id="pickup_zone_id"
              required
              value={form.pickup_zone_id}
              onChange={(e) => update('pickup_zone_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dropoff_zone_id" className="block text-sm font-medium text-gray-700">
              Dropoff zone
            </label>
            <select
              id="dropoff_zone_id"
              required
              value={form.dropoff_zone_id}
              onChange={(e) => update('dropoff_zone_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="dropoff_address" className="block text-sm font-medium text-gray-700">
              Dropoff address
            </label>
            <input
              id="dropoff_address"
              type="text"
              required
              value={form.dropoff_address}
              onChange={(e) => update('dropoff_address', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
              Customer name
            </label>
            <input
              id="customer_name"
              type="text"
              required
              value={form.customer_name}
              onChange={(e) => update('customer_name', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700">
              Customer phone
            </label>
            <input
              id="customer_phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{7,15}"
              required
              value={form.customer_phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                update('customer_phone', val)
              }}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="package_description"
              className="block text-sm font-medium text-gray-700"
            >
              Package description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="package_description"
              rows={2}
              value={form.package_description}
              onChange={(e) => update('package_description', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-sm font-medium text-gray-700">Payment method</span>
            <div className="mt-2 inline-flex rounded-md border border-gray-300 p-1">
              {(['cash', 'transfer'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => update('payment_method', method)}
                  className={`rounded px-4 py-1.5 text-sm font-medium capitalize ${
                    form.payment_method === method
                      ? 'bg-anx-navy text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery fee */}
        <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Delivery fee</span>
            <span className="text-lg font-extrabold text-anx-navy">
              {feeLoading
                ? 'Calculating…'
                : fee !== null
                  ? formatNaira(fee)
                  : '—'}
            </span>
          </div>
          {feeError && <p className="mt-1 text-sm text-red-600">{feeError}</p>}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full justify-center rounded-md bg-anx-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-anx-navy-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? 'Creating…' : 'Create job'}
        </button>
      </form>
    </div>
  )
}
