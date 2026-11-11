import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { User } from '../users/user.entity.js';
import { TicketController } from './ticket.controller.js';
import { Ticket } from './ticket.entity.js';
import { TicketEventsService } from './ticket-events.service.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketService } from './ticket.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Ticket, TicketSequence, Device, User, Ubicacion])],
  controllers: [TicketController],
  providers: [TicketEventsService, TicketService],
})
export class TicketModule {}
