import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';

import { DeviceStatus } from '../inventory/device-status.enum.js';
import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { User } from '../users/user.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { EstadoFiltro, QueryTicketsDto } from './dto/query-tickets.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { formatTicketCode } from './ticket-code.js';
import { Ticket } from './ticket.entity.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketStatus } from './ticket-status.enum.js';
import { canTransition } from './ticket-status-transitions.js';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Ubicacion) private readonly locations: Repository<Ubicacion>,
  ) {}

  async findInbox(filters: QueryTicketsDto = {}) {
    // El filtro de estado es semántico: la UI envía una de las 5 vistas y aquí se
    // traduce a las columnas reales del ticket.
    //   EN_ESPERA     -> estado = ABIERTO
    //   EN_PROCESO    -> estado = EN_PROCESO
    //   OPERATIVO     -> estado = RESUELTO  AND estado_final = ACTIVO
    //   INACTIVO      -> estado = RESUELTO  AND estado_final = INACTIVO
    //   BAJA_TECNICA  -> estado = RESUELTO  AND estado_final = BAJA_TECNICA
    const where: FindOptionsWhere<Ticket> = {};

    if (filters.estado === EstadoFiltro.EN_ESPERA) {
      where.estado = TicketStatus.ABIERTO;
    } else if (filters.estado === EstadoFiltro.EN_PROCESO) {
      where.estado = TicketStatus.EN_PROCESO;
    } else if (filters.estado === EstadoFiltro.OPERATIVO) {
      where.estado = TicketStatus.RESUELTO;
      where.estado_final = DeviceStatus.ACTIVO;
    } else if (filters.estado === EstadoFiltro.INACTIVO) {
      where.estado = TicketStatus.RESUELTO;
      where.estado_final = DeviceStatus.INACTIVO;
    } else if (filters.estado === EstadoFiltro.BAJA_TECNICA) {
      where.estado = TicketStatus.RESUELTO;
      where.estado_final = DeviceStatus.BAJA_TECNICA;
    }

    if (filters.ubicacion) {
      const names = await this.resolveLocationNames(filters.ubicacion);
      where.ubicacion = names.length > 1 ? In(names) : names[0];
    }

    if (filters.desde || filters.hasta) {
      const start = filters.desde ? new Date(`${filters.desde}T00:00:00`) : new Date('1970-01-01T00:00:00');
      const end = filters.hasta ? new Date(`${filters.hasta}T23:59:59.999`) : new Date('9999-12-31T23:59:59.999');
      where.fecha_creacion = Between(start, end);
    }

    const tickets = await this.tickets.find({
      where,
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });

    const deviceIds = [
      ...new Set(tickets.map((ticket) => ticket.id_dispositivo).filter((id): id is number => id !== null)),
    ];
    const devices = deviceIds.length
      ? await this.devices.findBy({ id_dispositivo: In(deviceIds) })
      : [];
    const devicesById = new Map(devices.map((device) => [device.id_dispositivo, device]));

    return tickets.map((ticket) => {
      const device = ticket.id_dispositivo !== null ? devicesById.get(ticket.id_dispositivo) : undefined;
      return {
        ...ticket,
        dispositivo_tipo: device?.tipo ?? null,
        codigo_inventario: device?.codigo_inventario ?? null,
      };
    });
  }

  private async resolveLocationNames(nombre: string): Promise<string[]> {
    const location = await this.locations.findOneBy({ nombre });

    if (!location) {
      return [nombre];
    }

    const children = await this.locations.find({ where: { padre_id: location.id_ubicacion } });

    return [location.nombre, ...children.map((child) => child.nombre)];
  }

  async findAll(requesterRut: string) {
    return this.tickets.find({
      where: { id_solicitante: requesterRut },
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
  }

  async resolve(idTicket: number, resolveTicketDto: ResolveTicketDto, tecnicoRut: string) {
    const ticket = await this.tickets.findOneBy({ id_ticket: idTicket });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    if (!canTransition(ticket.estado, TicketStatus.RESUELTO)) {
      throw new ConflictException('Transición de estado no permitida');
    }

    const tecnico = await this.users.findOneBy({ rut: tecnicoRut });

    ticket.causa_raiz = resolveTicketDto.causa_raiz.trim();
    ticket.solucion_aplicada = resolveTicketDto.solucion_aplicada.trim();
    ticket.estado_final = resolveTicketDto.estado_final;
    ticket.tecnico_nombre = tecnico?.nombre ?? null;
    ticket.fecha_resolucion = new Date();
    ticket.estado = TicketStatus.RESUELTO;

    return this.tickets.save(ticket);
  }

  async changeStatus(idTicket: number, nextStatus: TicketStatus) {
    const ticket = await this.tickets.findOneBy({ id_ticket: idTicket });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    if (ticket.estado === nextStatus) {
      return ticket;
    }

    if (!canTransition(ticket.estado, nextStatus)) {
      throw new ConflictException('Transición de estado no permitida');
    }

    const result = await this.tickets.update(
      { id_ticket: idTicket, estado: ticket.estado },
      { estado: nextStatus },
    );

    if (!result.affected) {
      throw new ConflictException('El ticket fue modificado mientras se actualizaba');
    }

    return { ...ticket, estado: nextStatus };
  }

  async findBitacora(idTicket: number) {
    const ticket = await this.tickets.findOneBy({ id_ticket: idTicket });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    if (ticket.estado !== TicketStatus.RESUELTO) {
      throw new ConflictException('El ticket aún no tiene bitácora');
    }

    const device = ticket.id_dispositivo
      ? await this.devices.findOneBy({ id_dispositivo: ticket.id_dispositivo })
      : null;

    return {
      codigo_ticket: ticket.codigo_ticket,
      fecha_resolucion: ticket.fecha_resolucion,
      tecnico_nombre: ticket.tecnico_nombre,
      ubicacion: ticket.ubicacion,
      dispositivo_tipo: device?.tipo ?? null,
      codigo_inventario: device?.codigo_inventario ?? null,
      sintoma: ticket.sintoma,
      causa_raiz: ticket.causa_raiz,
      solucion_aplicada: ticket.solucion_aplicada,
      estado_final: ticket.estado_final,
    };
  }

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
        estado: TicketStatus.ABIERTO,
      });

      return tickets.save(ticket);
    });
  }
}
