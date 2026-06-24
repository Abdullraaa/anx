import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type NavItem = {
  to: string
  label: string
  icon: string
}

// Inline emoji icons keep the bottom nav readable on mobile without an icon dep.
const navItems: NavItem[] = [
  { to: '/jobs', label: 'Jobs', icon: '📦' },
  { to: '/jobs/new', label: 'Create Job', icon: '➕' },
  { to: '/riders', label: 'Riders', icon: '🛵' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/payouts', label: 'Payouts', icon: '💸' },
  { to: '/reconciliation', label: 'Reconciliation', icon: '🧾' },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-gray-200 md:bg-white">
        <div className="flex h-16 items-center px-6 text-lg font-semibold text-gray-900">
          ANX Admin
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/jobs'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <span className="text-base font-semibold text-gray-900 md:hidden">ANX Admin</span>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-gray-600 sm:inline">
                {user.name} ({user.role})
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Routed content. Extra bottom padding leaves room for the mobile nav. */}
        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-gray-200 bg-white md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/jobs'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`
            }
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            <span className="leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
