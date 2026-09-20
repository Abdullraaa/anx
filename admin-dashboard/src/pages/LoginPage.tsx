import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import lockupNavy from '../assets/brand/lockup-navy-text-orange-navy-x.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, user, login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  // ProtectedRoute redirects non-admins here with a reason.
  const [error, setError] = useState<string | null>(
    (location.state as { error?: string } | null)?.error ?? null,
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session && user?.role === 'admin') navigate('/dashboard', { replace: true })
  }, [session, user, navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(phone.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1>
            <img src={lockupNavy} alt="ANX Admin" className="h-14 w-auto" />
          </h1>
          <p className="mt-1 text-sm text-gray-500">Use your phone number and password.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-anx-orange focus:outline-none focus:ring-1 focus:ring-anx-orange"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-anx-orange focus:outline-none focus:ring-1 focus:ring-anx-orange"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-md bg-anx-navy px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-anx-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
