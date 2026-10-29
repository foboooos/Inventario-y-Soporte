import { CreateTicketForm } from './CreateTicketForm'
import { TicketHistory } from './TicketHistory'

type SupportPageProps = {
  accessToken: string
  onSessionExpired: () => void
  refreshKey: number
  onTicketCreated: () => void
}

export function SupportPage({ accessToken, onSessionExpired, refreshKey, onTicketCreated }: SupportPageProps) {
  return (
    <main className="support-shell">
      <section className="support-content" aria-label="Soporte">
        <CreateTicketForm
          accessToken={accessToken}
          onSessionExpired={onSessionExpired}
          onTicketCreated={onTicketCreated}
        />
        <TicketHistory
          accessToken={accessToken}
          onSessionExpired={onSessionExpired}
          refreshKey={refreshKey}
          desktopOnly
        />
      </section>
    </main>
  )
}
