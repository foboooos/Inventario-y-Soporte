import { IsEnum } from 'class-validator';
import { TicketStatus } from '../ticket-status.enum.js';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  estado!: TicketStatus;
}
