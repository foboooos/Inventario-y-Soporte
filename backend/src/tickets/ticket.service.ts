import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';

import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { User } from '../users/user.entity.js';
import { normalizeRut } from '../users/rut.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { formatTicketCode } from './ticket-code.js';
import { Ticket } from './ticket.entity.js';
import { TicketEventsService } from './ticket-events.service.js';
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
    private readonly ticketEvents: TicketEventsService,
  ) {}

  private toApiTicket(ticket: Ticket, locationName = ticket.ubicacion_relacion?.nombre ?? '') {
    const { ubicacion_relacion: _ubicacion_relacion, id_tecnico: _id_tecnico, tecnico: _tecnico, ...fields } = ticket;
    return { ...fields, ubicacion: locationName };
  }

  async findInbox(filters: Partial<QueryTicketsDto> = {}) {
    const where: FindOptionsWhere<Ticket> = {};

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.ubicacion) {
      const ids = await this.resolveLocationIds(filters.ubicacion);
      where.id_ubicacion = In(ids);
    }

    if (filters.desde || filters.hasta) {
      const start = filters.desde ? new Date(`${filters.desde}T00:00:00`) : new Date('1970-01-01T00:00:00');
      const end = filters.hasta ? new Date(`${filters.hasta}T23:59:59.999`) : new Date('9999-12-31T23:59:59.999');
      where.fecha_creacion = Between(start, end);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    const [tickets, total] = await this.tickets.findAndCount({
      where,
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { ubicacion_relacion: true },
    });

    const deviceIds = [
      ...new Set(tickets.map((ticket) => ticket.id_dispositivo).filter((id): id is number => id !== null)),
    ];
    const devices = deviceIds.length
      ? await this.devices.findBy({ id_dispositivo: In(deviceIds) })
      : [];
    const devicesById = new Map(devices.map((device) => [device.id_dispositivo, device]));

    const solicitanteRuts = [...new Set(tickets.map((ticket) => normalizeRut(ticket.id_solicitante)))];
    const solicitantes = solicitanteRuts.length
      ? await this.users.findBy({ rut: In(solicitanteRuts) })
      : [];
    const solicitantesByRut = new Map(solicitantes.map((user) => [user.rut, user]));

    return {
      data: tickets.map((ticket) => {
        const device = ticket.id_dispositivo !== null ? devicesById.get(ticket.id_dispositivo) : undefined;
        return {
          ...this.toApiTicket(ticket),
          dispositivo_tipo: device?.tipo ?? null,
          codigo_inventario: device?.codigo_inventario ?? null,
          solicitante_nombre: solicitantesByRut.get(normalizeRut(ticket.id_solicitante))?.nombre ?? null,
        };
      }),
      total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async resolveLocationIds(nombre: string): Promise<number[]> {
    const location = await this.locations.findOneBy({ nombre });

    if (!location) {
      return [];
    }

    const ids = [location.id_ubicacion];
    let parentIds = ids;

    for (let depth = 0; depth < 2 && parentIds.length > 0; depth += 1) {
      const children = await this.locations.find({ where: { padre_id: In(parentIds) } });
      parentIds = children.map((child) => child.id_ubicacion);
      ids.push(...parentIds);
    }

    return ids;
  }

  async findAll(requesterRut: string, query: Partial<QueryTicketsDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [data, total] = await this.tickets.findAndCount({
      where: { id_solicitante: requesterRut },
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { ubicacion_relacion: true },
    });

    return {
      data: data.map((ticket) => this.toApiTicket(ticket)),
      total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async resolve(idTicket: number, resolveTicketDto: ResolveTicketDto, tecnicoRut: string) {
    return this.tickets.manager.transaction(async (manager) => {
      const tickets = manager.getRepository(Ticket);
      const devices = manager.getRepository(Device);
      const users = manager.getRepository(User);
      const ticket = await tickets.findOne({
        where: { id_ticket: idTicket },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ticket) {
        throw new NotFoundException('El ticket no existe');
      }

      if (!canTransition(ticket.estado, TicketStatus.RESUELTO)) {
        throw new ConflictException('Transición de estado no permitida');
      }

      const tecnico = await users.findOneBy({ rut: tecnicoRut });
      if (!tecnico) throw new UnauthorizedException('Sesión inválida');
      const hasDevice = typeof ticket.id_dispositivo === 'number';

      if (hasDevice && !resolveTicketDto.estado_final) {
        throw new BadRequestException('Debes indicar el estado final del dispositivo');
      }

      ticket.causa_raiz = resolveTicketDto.causa_raiz.trim();
      ticket.solucion_aplicada = resolveTicketDto.solucion_aplicada.trim();
      ticket.estado_final = hasDevice ? resolveTicketDto.estado_final! : null;
      ticket.id_tecnico = tecnico.rut;
      ticket.tecnico_nombre = tecnico.nombre;
      ticket.fecha_resolucion = new Date();
      ticket.estado = TicketStatus.RESUELTO;

      const saved = await tickets.save(ticket);

      if (typeof saved.id_dispositivo === 'number') {
        const result = await devices.update(
          { id_dispositivo: saved.id_dispositivo },
          { estado: resolveTicketDto.estado_final! },
        );

        if (!result.affected) {
          throw new NotFoundException('El dispositivo asociado no existe');
        }
      }

      const location = await manager.getRepository(Ubicacion).findOneBy({ id_ubicacion: saved.id_ubicacion });
      return this.toApiTicket(saved, location?.nombre ?? '');
    });
  }

  async changeStatus(idTicket: number, nextStatus: TicketStatus) {
    const ticket = await this.tickets.findOneBy({ id_ticket: idTicket });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    if (nextStatus === TicketStatus.RESUELTO) {
      throw new ConflictException('Para resolver el ticket debes registrar la bitácora');
    }

    const location = await this.locations.findOneBy({ id_ubicacion: ticket.id_ubicacion });

    if (ticket.estado === nextStatus) {
      return this.toApiTicket(ticket, location?.nombre ?? '');
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

    return this.toApiTicket({ ...ticket, estado: nextStatus }, location?.nombre ?? '');
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
      ubicacion: (await this.locations.findOneBy({ id_ubicacion: ticket.id_ubicacion }))?.nombre ?? '',
      dispositivo_tipo: device?.tipo ?? null,
      codigo_inventario: device?.codigo_inventario ?? null,
      sintoma: ticket.sintoma,
      causa_raiz: ticket.causa_raiz,
      solucion_aplicada: ticket.solucion_aplicada,
      estado_final: ticket.estado_final,
    };
  }

  async create(createTicketDto: CreateTicketDto, requesterRut: string) {
    const { ticket, locationName } = await this.tickets.manager.transaction(async (transactionManager) => {
      const tickets = transactionManager.getRepository(Ticket);
      const devices = transactionManager.getRepository(Device);
      const locations = transactionManager.getRepository(Ubicacion);
      const sequences = transactionManager.getRepository(TicketSequence);
      let deviceId: number | null = null;
      let idUbicacion: number | null = null;
      let nombreUbicacion = createTicketDto.ubicacion.trim();

      if (createTicketDto.id_dispositivo !== undefined) {
        const device = await devices.findOneBy({ id_dispositivo: createTicketDto.id_dispositivo });
        if (!device) throw new NotFoundException('El dispositivo seleccionado no existe');
        deviceId = device.id_dispositivo;
        idUbicacion = device.id_ubicacion;
      }

      const location = idUbicacion === null
        ? await locations.findOneBy({ nombre: nombreUbicacion })
        : await locations.findOneBy({ id_ubicacion: idUbicacion });

      if (!location) {
        throw new NotFoundException('La ubicación no existe');
      }
      idUbicacion = location.id_ubicacion;
      nombreUbicacion = location.nombre;

      const requester = await transactionManager.getRepository(User).findOne({
        where: { rut: requesterRut },
        lock: { mode: 'pessimistic_read' },
      });

      if (!requester) {
        throw new UnauthorizedException('Sesión inválida');
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
        id_solicitante: requester.rut,
        id_dispositivo: deviceId,
        id_ubicacion: idUbicacion,
        ubicacion_relacion: location,
        anio_ticket: year,
        sintoma: createTicketDto.sintoma.trim(),
        estado: TicketStatus.ABIERTO,
      });

      return { ticket: await tickets.save(ticket), locationName: nombreUbicacion };
    });

    this.ticketEvents.publishCreated(ticket);
    return this.toApiTicket(ticket, locationName);
  }
}
