import type { DeviceStatus, DeviceType } from './inventory'

export type DeviceOption = {
  id_dispositivo: number
  codigo_inventario: string
  tipo: DeviceType
  marca: string | null
  modelo: string | null
  ubicacion: string
}

export type CreateTicketInput = {
  ubicacion: string
  sintoma: string
  id_dispositivo?: number
}

export type TicketStatus = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO'

export type ResolveTicketInput = {
  causa_raiz: string
  solucion_aplicada: string
  estado_final: DeviceStatus
}

export type Ticket = {
  id_ticket: number
  codigo_ticket: string
  id_solicitante?: string
  id_dispositivo?: number | null
  dispositivo_tipo?: DeviceType | null
  codigo_inventario?: string | null
  estado: TicketStatus
  ubicacion: string
  sintoma: string
  causa_raiz?: string | null
  solucion_aplicada?: string | null
  estado_final?: DeviceStatus | null
  fecha_resolucion?: string | null
  tecnico_nombre?: string | null
  fecha_creacion?: string
}

export type TicketBitacora = {
  codigo_ticket: string
  fecha_resolucion?: string | null
  tecnico_nombre?: string | null
  ubicacion: string
  dispositivo_tipo: DeviceType | null
  codigo_inventario: string | null
  sintoma: string
  causa_raiz?: string | null
  solucion_aplicada?: string | null
  estado_final?: DeviceStatus | null
}
