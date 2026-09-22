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

export type Ticket = {
  id_ticket: number
  codigo_ticket: string
  id_solicitante?: string
  id_dispositivo?: number | null
  estado: TicketStatus
  ubicacion: string
  sintoma: string
  fecha_creacion?: string
}
