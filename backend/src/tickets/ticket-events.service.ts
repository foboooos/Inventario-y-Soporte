import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Ticket } from './ticket.entity.js';

@Injectable()
export class TicketEventsService {
  private readonly createdEvents = new Subject<MessageEvent>();

  stream(): Observable<MessageEvent> {
    return this.createdEvents.asObservable();
  }

  publishCreated(ticket: Ticket): void {
    this.createdEvents.next({
      type: 'ticket.created',
      data: { codigo_ticket: ticket.codigo_ticket },
    });
  }
}
