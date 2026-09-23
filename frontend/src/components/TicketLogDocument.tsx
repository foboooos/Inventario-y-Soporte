import { createPortal } from 'react-dom'
import type { DeviceStatus, DeviceType } from '../types/inventory'
import type { TicketBitacora } from '../types/ticket'

type TicketLogDocumentProps = {
  bitacora: TicketBitacora
  onClose: () => void
}

const deviceOptions: Array<{ value: DeviceType; label: string }> = [
  { value: 'PC', label: 'PC' },
  { value: 'PROYECTOR', label: 'Proyector' },
  { value: 'IMPRESORA', label: 'Impresora' },
  { value: 'RED', label: 'Red' },
]

const finalStatusOptions: Array<{ value: DeviceStatus; label: string }> = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'BAJA_TECNICA', label: 'Baja Técnica' },
]

function formatDate(value?: string | null) {
  if (!value) return 'No disponible'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day} / ${month} / ${date.getFullYear()}`
}

function CheckOption({ checked, label }: { checked: boolean; label: string }) {
  return <span className="ticket-log-check">{`[${checked ? 'x' : ' '}] ${label}`}</span>
}

export function TicketLogDocument({ bitacora, onClose }: TicketLogDocumentProps) {
  const solutionSteps = (bitacora.solucion_aplicada ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return createPortal(
    <div
      className="modal-backdrop ticket-log-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="modal-card ticket-log-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Bitácora del ticket ${bitacora.codigo_ticket}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ticket-log-toolbar no-print">
          <button className="primary-action" type="button" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
          <button className="primary-action" type="button" onClick={onClose}>Cerrar</button>
        </div>

        <article className="ticket-log-document">
          <h1 className="ticket-log-title">REGISTRO DE ATENCIÓN DE INCIDENTES</h1>

          <dl className="ticket-log-fields">
            <div>
              <dt>Código de Ticket</dt>
              <dd>{bitacora.codigo_ticket}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatDate(bitacora.fecha_resolucion)}</dd>
            </div>
            <div>
              <dt>Técnico Responsable</dt>
              <dd>{bitacora.tecnico_nombre ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{bitacora.ubicacion}</dd>
            </div>
            <div>
              <dt>Dispositivo</dt>
              <dd className="ticket-log-checks">
                {deviceOptions.map((option) => (
                  <CheckOption key={option.value} checked={bitacora.dispositivo_tipo === option.value} label={option.label} />
                ))}
              </dd>
            </div>
            <div>
              <dt>Código de Inventario</dt>
              <dd>{bitacora.codigo_inventario ?? '—'}</dd>
            </div>
          </dl>

          <h2>Diagnóstico y Causa Raíz</h2>
          <p><strong>Síntoma:</strong> {bitacora.sintoma}</p>
          <p><strong>Causa Identificada:</strong> {bitacora.causa_raiz ?? 'No disponible'}</p>

          <h2>Solución Aplicada</h2>
          {solutionSteps.length > 0 ? (
            <ul className="ticket-log-solution">
              {solutionSteps.map((step, index) => <li key={index}>{step}</li>)}
            </ul>
          ) : (
            <p>No disponible</p>
          )}

          <h2>Estado Final</h2>
          <p className="ticket-log-checks">
            <span className="ticket-log-check-label">Estado:</span>
            {finalStatusOptions.map((option) => (
              <CheckOption key={option.value} checked={bitacora.estado_final === option.value} label={option.label} />
            ))}
          </p>
        </article>
      </section>
    </div>,
    document.body,
  )
}
