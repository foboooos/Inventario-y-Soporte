import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Device } from '../inventory/device.entity.js';
import { TicketController } from './ticket.controller.js';
import { Ticket } from './ticket.entity.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketService } from './ticket.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Ticket, TicketSequence, Device])],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
