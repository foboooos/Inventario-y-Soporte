import { TicketHistory } from './TicketHistory'

type HistoryPageProps = {
  accessToken: string
  onSessionExpired: () => void
  refreshKey: number
}

export function HistoryPage({ accessToken, onSessionExpired, refreshKey }: HistoryPageProps) {
  return (
    <main className="support-shell">
      <section className="support-content" aria-label="Historial de tickets">
        <TicketHistory accessToken={accessToken} onSessionExpired={onSessionExpired} refreshKey={refreshKey} />
      </section>
    </main>
  )
}
