import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { Device } from '../inventory/device.entity.js';
import { User } from '../users/user.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { Ticket } from './ticket.entity.js';
import { TicketService } from './ticket.service.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketStatus } from './ticket-status.enum.js';


function createService(
  tickets: Partial<Repository<Ticket>>,
  devices: Partial<Repository<Device>> = {},
  users: Partial<Repository<User>> = {},
) {
  return new TicketService(
    tickets as Repository<Ticket>,
    devices as Repository<Device>,
    users as Repository<User>,
  );
}


describe('TicketService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns every ticket ordered from newest to oldest for the technical inbox', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = createService({ find });

    await service.findInbox();

    expect(find).toHaveBeenCalledWith({
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
  });

  it('filters ticket history by requester for a teacher', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = createService({ find });

    await service.findAll('12345678-9');

    expect(find).toHaveBeenCalledWith({
      where: { id_solicitante: '12345678-9' },
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
  });


  it('deletes only a ticket owned by the authenticated teacher', async () => {
    const deleteTicket = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ delete: deleteTicket });

    await service.remove(7, '12345678-9');

    expect(deleteTicket).toHaveBeenCalledWith({
      id_ticket: 7,
      id_solicitante: '12345678-9',
    });
  });

  it('rejects deletion when the ticket is not owned by the teacher', async () => {
    const deleteTicket = vi.fn().mockResolvedValue({ affected: 0 });
    const service = createService({ delete: deleteTicket });

    await expect(service.remove(7, '12345678-9')).rejects.toThrow(NotFoundException);
  });

  it('stores the resolution with the technician, date and final status', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.EN_PROCESO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const save = vi.fn().mockResolvedValue(ticket);
    const service = createService(
      { findOneBy, save },
      {},
      { findOneBy: vi.fn().mockResolvedValue({ rut: '12345678-9', nombre: 'Ana Pérez' } as User) },
    );
    const input = {
      causa_raiz: 'Falla en la fuente de poder',
      solucion_aplicada: 'Se reemplazó la fuente y se verificó el encendido',
      estado_final: DeviceStatus.ACTIVO,
    } as ResolveTicketDto;

    const result = await service.resolve(7, input, '12345678-9');

    expect(findOneBy).toHaveBeenCalledWith({ id_ticket: 7 });
    expect(ticket).toMatchObject({
      causa_raiz: input.causa_raiz,
      solucion_aplicada: input.solucion_aplicada,
      estado_final: DeviceStatus.ACTIVO,
      tecnico_nombre: 'Ana Pérez',
      fecha_resolucion: new Date('2026-04-15T12:00:00.000Z'),
      estado: TicketStatus.RESUELTO,
    });
    expect(save).toHaveBeenCalledWith(ticket);
    expect(result).toBe(ticket);
  });

  it('rejects resolving a ticket that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.resolve(7, {
      causa_raiz: 'Falla',
      solucion_aplicada: 'Reparación',
      estado_final: DeviceStatus.ACTIVO,
    }, '12345678-9')).rejects.toThrow(NotFoundException);
  });

  it('rejects resolving a ticket that is already resolved', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.RESUELTO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const service = createService({ findOneBy });

    await expect(service.resolve(7, {
      causa_raiz: 'Falla',
      solucion_aplicada: 'Reparación',
      estado_final: DeviceStatus.ACTIVO,
    }, '12345678-9')).rejects.toThrow(ConflictException);
  });

  it('builds the bitácora record for a resolved ticket with its device', async () => {
    const ticket = {
      id_ticket: 7,
      codigo_ticket: 'TCK-2026-0007',
      estado: TicketStatus.RESUELTO,
      id_dispositivo: 5,
      ubicacion: 'Laboratorio 1',
      sintoma: 'No enciende',
      causa_raiz: 'Fuente dañada',
      solucion_aplicada: 'Se reemplazó la fuente',
      tecnico_nombre: 'Ana Pérez',
      fecha_resolucion: new Date('2026-04-15T12:00:00.000Z'),
      estado_final: DeviceStatus.ACTIVO,
    } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const findDevice = vi.fn().mockResolvedValue({ id_dispositivo: 5, codigo_inventario: 'PRJ-SALA-02', tipo: 'PROYECTOR' } as Device);
    const service = createService({ findOneBy }, { findOneBy: findDevice });

    const result = await service.findBitacora(7);

    expect(result).toEqual({
      codigo_ticket: 'TCK-2026-0007',
      fecha_resolucion: ticket.fecha_resolucion,
      tecnico_nombre: 'Ana Pérez',
      ubicacion: 'Laboratorio 1',
      dispositivo_tipo: 'PROYECTOR',
      codigo_inventario: 'PRJ-SALA-02',
      sintoma: 'No enciende',
      causa_raiz: 'Fuente dañada',
      solucion_aplicada: 'Se reemplazó la fuente',
      estado_final: DeviceStatus.ACTIVO,
    });
    expect(findDevice).toHaveBeenCalledWith({ id_dispositivo: 5 });
  });

  it('rejects the bitácora of a ticket that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.findBitacora(7)).rejects.toThrow(NotFoundException);
  });

  it('rejects the bitácora of a ticket that is not resolved', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.EN_PROCESO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const service = createService({ findOneBy });

    await expect(service.findBitacora(7)).rejects.toThrow(ConflictException);
  });

  it('moves an open ticket to in progress with a conditional update', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.ABIERTO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const update = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ findOneBy, update });

    const result = await service.changeStatus(7, TicketStatus.EN_PROCESO);

    expect(update).toHaveBeenCalledWith(
      { id_ticket: 7, estado: TicketStatus.ABIERTO },
      { estado: TicketStatus.EN_PROCESO },
    );
    expect(result).toEqual({ ...ticket, estado: TicketStatus.EN_PROCESO });
  });

  it('keeps an in-progress ticket unchanged when it is started again', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.EN_PROCESO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const update = vi.fn();
    const service = createService({ findOneBy, update });

    const result = await service.changeStatus(7, TicketStatus.EN_PROCESO);

    expect(update).not.toHaveBeenCalled();
    expect(result).toBe(ticket);
  });

  it('rejects an invalid status transition', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.RESUELTO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const service = createService({ findOneBy });

    await expect(service.changeStatus(7, TicketStatus.EN_PROCESO)).rejects.toThrow(ConflictException);
  });

  it('rejects changing the status of a ticket that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.changeStatus(7, TicketStatus.EN_PROCESO)).rejects.toThrow(NotFoundException);
  });

  it('reports a conflict when the ticket changed while updating', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.ABIERTO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const update = vi.fn().mockResolvedValue({ affected: 0 });
    const service = createService({ findOneBy, update });

    await expect(service.changeStatus(7, TicketStatus.EN_PROCESO)).rejects.toThrow(ConflictException);
  });

  it('creates a ticket with the next yearly correlativo inside a transaction', async () => {
    const sequence = { anio: 2026, ultimo_numero: 0 } as TicketSequence;
    const createdTicket = {
      codigo_ticket: 'TCK-2026-0001',
      id_solicitante: '12345678-9',
      id_dispositivo: null,
      ubicacion: 'Laboratorio 1',
      sintoma: 'No enciende',
      estado: TicketStatus.ABIERTO,
    } as Ticket;
    const sequenceQueryBuilder = {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const deviceRepository = {
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    const sequenceRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(sequenceQueryBuilder),
      findOne: vi.fn().mockResolvedValue(sequence),
      save: vi.fn().mockResolvedValue(sequence),
    };
    const transactionManager = {
      getRepository: vi.fn(),
    };
    const transaction = vi.fn(async <T>(work: (manager: typeof transactionManager) => Promise<T>) => work(transactionManager));
    const ticketRepository = {
      manager: { transaction },
      create: vi.fn().mockReturnValue(createdTicket),
      save: vi.fn().mockResolvedValue(createdTicket),
    };
    transactionManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Ticket) return ticketRepository;
      if (entity === Device) return deviceRepository;
      return sequenceRepository;
    });

    const service = createService(ticketRepository);
    const input = {
      ubicacion: 'Laboratorio 1',
      sintoma: 'No enciende',
    } as CreateTicketDto;

    const result = await service.create(input, '12345678-9');

    expect(transaction).toHaveBeenCalledOnce();
    expect(sequence.ultimo_numero).toBe(1);
    expect(ticketRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      codigo_ticket: 'TCK-2026-0001',
      estado: TicketStatus.ABIERTO,
    }));
    expect(result).toBe(createdTicket);
  });
});
