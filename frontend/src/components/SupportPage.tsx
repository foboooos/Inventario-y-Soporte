import { useState } from 'react'
import type { AuthUser } from '../types/auth'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'
import { CreateTicketForm } from './CreateTicketForm'
import { TicketHistory } from './TicketHistory'

type SupportPageProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
  accessToken: string
}

export function SupportPage({ user, activeRoute, onNavigate, onLogout, accessToken }: SupportPageProps) {
  const [ticketHistoryRefreshKey, setTicketHistoryRefreshKey] = useState(0)

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-shell">
        <section className="support-content" aria-label="Soporte">
          <CreateTicketForm
            accessToken={accessToken}
            onSessionExpired={onLogout}
            onTicketCreated={() => setTicketHistoryRefreshKey((key) => key + 1)}
          />
          <TicketHistory
            accessToken={accessToken}
            onSessionExpired={onLogout}
            refreshKey={ticketHistoryRefreshKey}
          />
        </section>
      </main>
    </DashboardLayout>
  )
}
