import type { Repository } from 'typeorm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Device } from '../inventory/device.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { Ticket } from './ticket.entity.js';
import { TicketService } from './ticket.service.js';
import { TicketSequence } from './ticket-sequence.entity.js';
import { TicketStatus } from './ticket-status.enum.js';
import { UserRole } from '../users/user-role.enum.js';

describe('TicketService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters ticket history by requester for a teacher', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = new TicketService({ find } as unknown as Repository<Ticket>);

    await service.findAll('12345678-9', UserRole.DOCENTE);

    expect(find).toHaveBeenCalledWith({
      where: { id_solicitante: '12345678-9' },
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
  });

  it('returns all tickets for administrators and technicians', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = new TicketService({ find } as unknown as Repository<Ticket>);

    await service.findAll('12345678-9', UserRole.TECNICO);

    expect(find).toHaveBeenCalledWith({
      order: { fecha_creacion: 'DESC', id_ticket: 'DESC' },
    });
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
