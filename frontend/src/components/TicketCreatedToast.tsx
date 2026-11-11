type TicketCreatedToastProps = {
  ticketCode: string
  onOpenInbox: () => void
  onClose: () => void
}

export function TicketCreatedToast({ ticketCode, onClose }: TicketCreatedToastProps) {
  return (
    <div className="ticket-created-toast-content">
      <div className="ticket-created-toast-info">
        <strong className="ticket-created-toast-title">Nuevo ticket recibido</strong>
        <span className="ticket-created-toast-code">
          <span>Código</span>
          <code>{ticketCode}</code>
        </span>
      </div>
      <div className="ticket-created-toast-actions">
        <button
          className="ticket-toast-close"
          type="button"
          aria-label="Cerrar notificación"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
  )
}
