import { useRef, useState } from 'react'
import type { TicketBitacora } from '../types/ticket'
import { downloadTicketLogPdf } from '../utils/ticketLogPdf'
import {
  formatTicketLogDate,
  ticketLogDeviceLabels,
  ticketLogSolutionSteps,
  ticketLogStatusLabels,
} from '../utils/ticketLog'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

type TicketLogDocumentProps = {
  bitacora: TicketBitacora
  onClose: () => void
}

export function TicketLogDocument({ bitacora, onClose }: TicketLogDocumentProps) {
  const modalRef = useRef<ModalHandle>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const solutionSteps = ticketLogSolutionSteps(bitacora.solucion_aplicada)
  const deviceLabel = bitacora.dispositivo_tipo ? ticketLogDeviceLabels[bitacora.dispositivo_tipo] : null
  const device = deviceLabel
    ? `${deviceLabel}${bitacora.codigo_inventario ? ` · ${bitacora.codigo_inventario}` : ''}`
    : '—'
  const finalStatus = bitacora.estado_final ? ticketLogStatusLabels[bitacora.estado_final] : null
  const closeDate = bitacora.fecha_resolucion ? formatTicketLogDate(bitacora.fecha_resolucion) : null

  async function savePdf() {
    setSaving(true)
    setError('')

    try {
      await downloadTicketLogPdf(bitacora)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo generar el PDF')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      portal
      label={`Bitácora del ticket ${bitacora.codigo_ticket}`}
      backdropClassName="ticket-log-backdrop"
      cardClassName="modal-card ticket-log-modal"
      onClose={onClose}
    >
      <div className="ticket-log-body">
        <article className="ticket-log-document">
          <header className="ticket-log-heading">
            <p className="config-dialog-text">
              {closeDate ? `Cerrado el ${closeDate}` : 'Fecha de cierre no registrada'}
            </p>
          </header>

          <dl className="ticket-log-summary">
            <div>
              <dt>Ubicación</dt>
              <dd>{bitacora.ubicacion || '—'}</dd>
            </div>
            <div>
              <dt>Dispositivo</dt>
              <dd>{device}</dd>
            </div>
            <div>
              <dt>Estado final</dt>
              <dd>
                {finalStatus && bitacora.estado_final ? (
                  <span className={`status status-${bitacora.estado_final.toLowerCase().replace('_', '-')}`}>
                    {finalStatus}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Técnico responsable</dt>
              <dd>{bitacora.tecnico_nombre ?? '—'}</dd>
            </div>
          </dl>

          <div className="ticket-log-sections">
            <section className="ticket-log-block" aria-label="Síntoma">
              <h3>Síntoma</h3>
              <p>{bitacora.sintoma}</p>
            </section>

            <section className="ticket-log-block" aria-label="Diagnóstico y causa raíz">
              <h3>Diagnóstico y causa raíz</h3>
              <p>{bitacora.causa_raiz ?? '—'}</p>
            </section>

            <section className="ticket-log-block" aria-label="Solución aplicada">
              <h3>Solución aplicada</h3>
              <p>{solutionSteps.length > 0 ? solutionSteps.join('\n') : '—'}</p>
            </section>
          </div>
        </article>
      </div>

      <div className="ticket-log-actions no-print">
        {error && <p className="error ticket-log-error" role="alert">{error}</p>}
        <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()}>Cerrar</button>
        <button className="primary-action primary-action-solid" type="button" disabled={saving} onClick={savePdf}>
          {saving ? 'Generando…' : 'Guardar PDF'}
        </button>
      </div>
    </Modal>
  )
}
