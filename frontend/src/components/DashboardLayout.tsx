import type { ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { Sidebar, type RouteKey } from './Sidebar'

type DashboardLayoutProps = {
  children: ReactNode
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

export function DashboardLayout({ children, user, activeRoute, onNavigate, onLogout }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="dashboard-main">{children}</div>
    </div>
  )
}
