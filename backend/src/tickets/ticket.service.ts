import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { Ticket } from './ticket.entity.js';
import { TicketStatus } from './ticket-status.enum.js';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  async create(createTicketDto: CreateTicketDto, requesterRut: string) {
    let deviceId: number | null = null;

    if (createTicketDto.id_dispositivo !== undefined) {
      const device = await this.devices.findOneBy({ id_dispositivo: createTicketDto.id_dispositivo });
      if (!device) throw new NotFoundException('El dispositivo seleccionado no existe');
      deviceId = device.id_dispositivo;
    }

    const ticket = this.tickets.create({
      codigo_ticket: `TCK-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`,
      id_solicitante: requesterRut,
      id_dispositivo: deviceId,
      ubicacion: createTicketDto.ubicacion.trim(),
      sintoma: createTicketDto.sintoma.trim(),
      estado: TicketStatus.ABIERTO,
    });

    return this.tickets.save(ticket);
  }
}
