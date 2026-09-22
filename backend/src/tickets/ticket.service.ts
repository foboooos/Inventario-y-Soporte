import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { formatTicketCode } from './ticket-code.js';
import { Ticket } from './ticket.entity.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketStatus } from './ticket-status.enum.js';

@Injectable()
export class TicketService {
  constructor(@InjectRepository(Ticket) private readonly tickets: Repository<Ticket>) {}

  async create(createTicketDto: CreateTicketDto, requesterRut: string) {
    return this.tickets.manager.transaction(async (transactionManager) => {
      const tickets = transactionManager.getRepository(Ticket);
      const devices = transactionManager.getRepository(Device);
      const sequences = transactionManager.getRepository(TicketSequence);
      let deviceId: number | null = null;

      if (createTicketDto.id_dispositivo !== undefined) {
        const device = await devices.findOneBy({ id_dispositivo: createTicketDto.id_dispositivo });
        if (!device) throw new NotFoundException('El dispositivo seleccionado no existe');
        deviceId = device.id_dispositivo;
      }

      const year = new Date().getFullYear();

      await sequences
        .createQueryBuilder()
        .insert()
        .into(TicketSequence)
        .values({ anio: year, ultimo_numero: 0 })
        .orIgnore()
        .execute();

      const sequence = await sequences.findOne({
        where: { anio: year },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sequence) {
        throw new InternalServerErrorException('No se pudo obtener la secuencia de tickets');
      }

      sequence.ultimo_numero += 1;
      await sequences.save(sequence);

      const ticket = tickets.create({
        codigo_ticket: formatTicketCode(year, sequence.ultimo_numero),
        id_solicitante: requesterRut,
        id_dispositivo: deviceId,
        ubicacion: createTicketDto.ubicacion.trim(),
        sintoma: createTicketDto.sintoma.trim(),
        estado: TicketStatus.EN_ESPERA,
      });

      return tickets.save(ticket);
    });
  }
}
