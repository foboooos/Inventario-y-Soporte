import type { AuthUser } from '../types/auth'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type ConfigurationPageProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

export function ConfigurationPage({ user, activeRoute, onNavigate, onLogout }: ConfigurationPageProps) {
  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-shell" />
    </DashboardLayout>
  )
}
