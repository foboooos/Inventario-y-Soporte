import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Device } from '../inventory/device.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { Ticket } from './ticket.entity.js';
import { TicketService } from './ticket.service.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketStatus } from './ticket-status.enum.js';


describe('TicketService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns pending tickets ordered from oldest to newest for the technical inbox', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = new TicketService({ find } as unknown as Repository<Ticket>);

    await service.findInbox();

    const [options] = find.mock.calls[0] as [{ where: { estado: { value: unknown } }; order: unknown }];
    expect(options.where.estado.value).toEqual([TicketStatus.ABIERTO, TicketStatus.EN_PROCESO]);
    expect(options.order).toEqual({ fecha_creacion: 'ASC', id_ticket: 'ASC' });
  });

  it('filters ticket history by requester for a teacher', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = new TicketService({ find } as unknown as Repository<Ticket>);

    await service.findAll('12345678-9');

    expect(find).toHaveBeenCalledWith({
      where: { id_solicitante: '12345678-9' },
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
  });


  it('deletes only a ticket owned by the authenticated teacher', async () => {
    const deleteTicket = vi.fn().mockResolvedValue({ affected: 1 });
    const service = new TicketService({ delete: deleteTicket } as unknown as Repository<Ticket>);

    await service.remove(7, '12345678-9');

    expect(deleteTicket).toHaveBeenCalledWith({
      id_ticket: 7,
      id_solicitante: '12345678-9',
    });
  });

  it('rejects deletion when the ticket is not owned by the teacher', async () => {
    const deleteTicket = vi.fn().mockResolvedValue({ affected: 0 });
    const service = new TicketService({ delete: deleteTicket } as unknown as Repository<Ticket>);

    await expect(service.remove(7, '12345678-9')).rejects.toThrow(NotFoundException);
  });

  it('stores the resolution and marks the ticket as resolved', async () => {
    const ticket = { id_ticket: 7, estado: TicketStatus.EN_PROCESO } as Ticket;
    const findOneBy = vi.fn().mockResolvedValue(ticket);
    const save = vi.fn().mockResolvedValue(ticket);
    const service = new TicketService({ findOneBy, save } as unknown as Repository<Ticket>);
    const input = {
      causa_raiz: 'Falla en la fuente de poder',
      solucion_aplicada: 'Se reemplazó la fuente y se verificó el encendido',
    } as ResolveTicketDto;

    const result = await service.resolve(7, input);

    expect(findOneBy).toHaveBeenCalledWith({ id_ticket: 7 });
    expect(ticket).toMatchObject({
      causa_raiz: input.causa_raiz,
      solucion_aplicada: input.solucion_aplicada,
      estado: TicketStatus.RESUELTO,
    });
    expect(save).toHaveBeenCalledWith(ticket);
    expect(result).toBe(ticket);
  });

  it('rejects resolving a ticket that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = new TicketService({ findOneBy } as unknown as Repository<Ticket>);

    await expect(service.resolve(7, {
      causa_raiz: 'Falla',
      solucion_aplicada: 'Reparación',
    })).rejects.toThrow(NotFoundException);
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

    const service = new TicketService(ticketRepository as unknown as Repository<Ticket>);
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
