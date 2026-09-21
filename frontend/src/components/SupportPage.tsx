import type { AuthUser } from '../types/auth'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'
import { CreateTicketForm } from './CreateTicketForm'

type SupportPageProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
  accessToken: string
}

export function SupportPage({ user, activeRoute, onNavigate, onLogout, accessToken }: SupportPageProps) {
  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-content" aria-labelledby="support-title">
        <h1 id="support-title">Soporte</h1>
        <CreateTicketForm accessToken={accessToken} onSessionExpired={onLogout} />
      </main>
    </DashboardLayout>
  )
}
