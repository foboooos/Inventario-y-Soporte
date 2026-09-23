import { TicketStatus } from './ticket-status.enum.js';

const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.ABIERTO]: [TicketStatus.EN_PROCESO, TicketStatus.RESUELTO],
  [TicketStatus.EN_PROCESO]: [TicketStatus.RESUELTO],
  [TicketStatus.RESUELTO]: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
