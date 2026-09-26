import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Device } from '../inventory/device.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { LocationService } from './location.service.js';
import { Ubicacion } from './ubicacion.entity.js';

function createService(
  locations: Partial<Repository<Ubicacion>>,
  devices: Partial<Repository<Device>> = {},
  tickets: Partial<Repository<Ticket>> = {},
) {
  return new LocationService(
    locations as Repository<Ubicacion>,
    devices as Repository<Device>,
    tickets as Repository<Ticket>,
  );
}

describe('LocationService', () => {
  it('lists locations ordered by name', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = createService({ find });

    await service.findAll();

    expect(find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
  });

  it('rejects creating a location that already exists', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_ubicacion: 1, nombre: 'Laboratorio 1' } as Ubicacion);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: '  Laboratorio 1  ' })).rejects.toThrow(ConflictException);
    expect(findOneBy).toHaveBeenCalledWith({ nombre: 'Laboratorio 1' });
  });

  it('trims the name when creating a location', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const save = vi.fn().mockResolvedValue({ id_ubicacion: 2, nombre: 'Sala 3' } as Ubicacion);
    const create = vi.fn((value: Partial<Ubicacion>) => value as Ubicacion);
    const service = createService({ findOneBy, save, create });

    const result = await service.create({ nombre: '  Sala 3  ' });

    expect(create).toHaveBeenCalledWith({ nombre: 'Sala 3' });
    expect(result).toEqual({ id_ubicacion: 2, nombre: 'Sala 3' });
  });

  it('propagates a rename to devices and tickets', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1' } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValueOnce(location).mockResolvedValueOnce(null);
    const save = vi.fn().mockResolvedValue(location);
    const deviceUpdate = vi.fn().mockResolvedValue({ affected: 2 });
    const ticketUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    const manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === Ubicacion) return { findOneBy, save };
        if (entity === Device) return { update: deviceUpdate };
        return { update: ticketUpdate };
      }),
    };
    const transaction = vi.fn(async <T>(work: (value: typeof manager) => Promise<T>) => work(manager));
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<Ubicacion>>);

    const result = await service.rename(5, { nombre: 'Laboratorio A' });

    expect(deviceUpdate).toHaveBeenCalledWith({ ubicacion: 'Laboratorio 1' }, { ubicacion: 'Laboratorio A' });
    expect(ticketUpdate).toHaveBeenCalledWith({ ubicacion: 'Laboratorio 1' }, { ubicacion: 'Laboratorio A' });
    expect(save).toHaveBeenCalledWith(location);
    expect(result.nombre).toBe('Laboratorio A');
  });

  it('keeps devices and tickets untouched when the name does not change', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1' } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const deviceUpdate = vi.fn();
    const ticketUpdate = vi.fn();
    const manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === Ubicacion) return { findOneBy, save: vi.fn() };
        if (entity === Device) return { update: deviceUpdate };
        return { update: ticketUpdate };
      }),
    };
    const transaction = vi.fn(async <T>(work: (value: typeof manager) => Promise<T>) => work(manager));
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<Ubicacion>>);

    const result = await service.rename(5, { nombre: '  Laboratorio 1  ' });

    expect(deviceUpdate).not.toHaveBeenCalled();
    expect(ticketUpdate).not.toHaveBeenCalled();
    expect(result).toBe(location);
  });

  it('rejects renaming a location that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const manager = {
      getRepository: vi.fn(() => ({ findOneBy })),
    };
    const transaction = vi.fn(async <T>(work: (value: typeof manager) => Promise<T>) => work(manager));
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<Ubicacion>>);

    await expect(service.rename(99, { nombre: 'Sala 3' })).rejects.toThrow(NotFoundException);
  });

  it('blocks deleting a location that still has devices', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1' } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const count = vi.fn().mockResolvedValue(2);
    const remove = vi.fn();
    const service = createService({ findOneBy, delete: remove }, { count });

    await expect(service.remove(5)).rejects.toThrow(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a location with no devices', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1' } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const count = vi.fn().mockResolvedValue(0);
    const remove = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ findOneBy, delete: remove }, { count });

    await service.remove(5);

    expect(remove).toHaveBeenCalledWith({ id_ubicacion: 5 });
  });

  it('rejects deleting a location that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
