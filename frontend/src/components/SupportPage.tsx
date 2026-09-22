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
      <main className="support-shell">
        <section className="support-content" aria-labelledby="support-title">
          <header className="page-heading support-page-heading">
            <div>
              <h1 id="support-title">Soporte</h1>
            </div>
          </header>
          <CreateTicketForm accessToken={accessToken} onSessionExpired={onLogout} />
        </section>
      </main>
    </DashboardLayout>
  )
}
