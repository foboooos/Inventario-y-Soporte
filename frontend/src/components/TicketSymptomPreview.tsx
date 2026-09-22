import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Ticket } from '../types/ticket'

type TicketSymptomPreviewProps = {
  ticket: Pick<Ticket, 'id_ticket' | 'codigo_ticket' | 'sintoma'>
}

export function TicketSymptomPreview({ ticket }: TicketSymptomPreviewProps) {
  const symptomTextRef = useRef<HTMLSpanElement | null>(null)
  const symptomToggleRef = useRef<HTMLButtonElement | null>(null)
  const symptomPopupRef = useRef<HTMLDivElement | null>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null)
  const expandedDescriptionId = `ticket-symptom-${ticket.id_ticket}`

  useEffect(() => {
    const symptomText = symptomTextRef.current
    if (!symptomText) return

    const updateOverflow = () => {
      setHasOverflow(symptomText.scrollWidth > symptomText.clientWidth)
    }

    updateOverflow()
    if (typeof ResizeObserver === 'undefined') return

    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(symptomText)
    return () => resizeObserver.disconnect()
  }, [ticket.sintoma])

  useLayoutEffect(() => {
    if (!isExpanded) return

    const popup = symptomPopupRef.current
    const toggle = symptomToggleRef.current
    if (!popup || !toggle) return

    const updatePopupPosition = () => {
      const toggleRect = toggle.getBoundingClientRect()
      const popupRect = popup.getBoundingClientRect()
      const viewportPadding = 16
      const gap = 8
      const canPlaceBelow = toggleRect.bottom + gap + popupRect.height <= window.innerHeight - viewportPadding
      const canPlaceAbove = toggleRect.top - gap - popupRect.height >= viewportPadding
      const top = canPlaceBelow
        ? toggleRect.bottom + gap
        : canPlaceAbove
          ? toggleRect.top - popupRect.height - gap
          : Math.max(viewportPadding, window.innerHeight - popupRect.height - viewportPadding)
      const left = Math.min(
        Math.max(viewportPadding, toggleRect.left),
        Math.max(viewportPadding, window.innerWidth - popupRect.width - viewportPadding),
      )

      setPopupPosition({ top, left })
    }

    updatePopupPosition()
    window.addEventListener('resize', updatePopupPosition)
    window.addEventListener('scroll', updatePopupPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopupPosition)
      window.removeEventListener('scroll', updatePopupPosition, true)
    }
  }, [isExpanded])

  return (
    <div className="ticket-symptom-content">
      <div className="ticket-history-symptom-preview">
        <span ref={symptomTextRef} className="ticket-history-symptom-text">{ticket.sintoma}</span>
        {hasOverflow && (
          <button
            ref={symptomToggleRef}
            className="ticket-symptom-toggle"
            type="button"
            aria-controls={expandedDescriptionId}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} síntoma completo del ticket ${ticket.codigo_ticket}`}
            onClick={() => {
              setPopupPosition(null)
              setIsExpanded((expanded) => !expanded)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        )}
      </div>
      {isExpanded && (
        <div
          ref={symptomPopupRef}
          id={expandedDescriptionId}
          className="ticket-symptom-expanded"
          role="region"
          aria-label={`Síntoma completo del ticket ${ticket.codigo_ticket}`}
          style={{
            top: popupPosition?.top ?? 0,
            left: popupPosition?.left ?? 0,
            visibility: popupPosition ? 'visible' : 'hidden',
          }}
        >
          {ticket.sintoma}
        </div>
      )}
    </div>
  )
}
