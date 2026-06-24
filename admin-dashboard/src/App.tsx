import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import JobsListPage from './pages/JobsListPage'
import CreateJobPage from './pages/CreateJobPage'
import RidersPage from './pages/RidersPage'

// Placeholder for sections delivered in later phases.
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Coming soon.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/jobs" element={<JobsListPage />} />
            <Route path="/jobs/new" element={<CreateJobPage />} />
            <Route path="/riders" element={<RidersPage />} />
            <Route path="/map" element={<ComingSoon title="Map" />} />
            <Route path="/payouts" element={<ComingSoon title="Payouts" />} />
            <Route path="/reconciliation" element={<ComingSoon title="Reconciliation" />} />
          </Route>
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
