export type DeviceOption = {
  id_dispositivo: number
  codigo_inventario: string
  ubicacion: string
}

export type CreateTicketInput = {
  ubicacion: string
  sintoma: string
  id_dispositivo?: number
}

export type TicketStatus = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO'

export type ResolveTicketInput = {
  causa_raiz: string
  solucion_aplicada: string
}

export type Ticket = {
  id_ticket: number
  codigo_ticket: string
  id_solicitante?: string
  id_dispositivo?: number | null
  estado: TicketStatus
  ubicacion: string
  sintoma: string
  causa_raiz?: string | null
  solucion_aplicada?: string | null
  fecha_creacion?: string
}
