import { useState, type ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { Sidebar } from './Sidebar'
import type { RouteKey } from '../routes'

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed'

type DashboardLayoutProps = {
  children: ReactNode
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

export function DashboardLayout({ children, user, activeRoute, onNavigate, onLogout }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className={`dashboard-layout${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar
        user={user}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <button
        className="sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        aria-expanded={!collapsed}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {collapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
        </svg>
      </button>
      <div className="dashboard-main">{children}</div>
    </div>
  )
}