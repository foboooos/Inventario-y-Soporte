import { useState } from 'react'
import { CreateTicketForm } from './CreateTicketForm'
import { TicketHistory } from './TicketHistory'

type SupportPageProps = {
  accessToken: string
  onSessionExpired: () => void
}

export function SupportPage({ accessToken, onSessionExpired }: SupportPageProps) {
  const [ticketHistoryRefreshKey, setTicketHistoryRefreshKey] = useState(0)

  return (
    <main className="support-shell">
      <section className="support-content" aria-label="Soporte">
        <CreateTicketForm
          accessToken={accessToken}
          onSessionExpired={onSessionExpired}
          onTicketCreated={() => setTicketHistoryRefreshKey((key) => key + 1)}
        />
        <TicketHistory
          accessToken={accessToken}
          onSessionExpired={onSessionExpired}
          refreshKey={ticketHistoryRefreshKey}
        />
      </section>
    </main>
  )
}
