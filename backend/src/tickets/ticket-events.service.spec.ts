import { describe, expect, it, vi } from 'vitest';
import { Ticket } from './ticket.entity.js';
import { TicketEventsService } from './ticket-events.service.js';

describe('TicketEventsService', () => {
  it('publishes the visible ticket code for connected listeners', () => {
    const events = new TicketEventsService();
    const listener = vi.fn();
    events.stream().subscribe(listener);

    events.publishCreated({ codigo_ticket: 'TCK-2026-0001' } as Ticket);

    expect(listener).toHaveBeenCalledWith({
      type: 'ticket.created',
      data: { codigo_ticket: 'TCK-2026-0001' },
    });
  });
});
