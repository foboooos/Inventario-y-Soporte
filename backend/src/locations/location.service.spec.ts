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
  it('lists locations ordered by id to preserve creation order', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = createService({ find });

    await service.findAll();

    expect(find).toHaveBeenCalledWith({ order: { id_ubicacion: 'ASC' } });
  });

  it('rejects creating a location that already exists', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_ubicacion: 1, nombre: 'Laboratorio 1' } as Ubicacion);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: '  Laboratorio 1  ' })).rejects.toThrow(ConflictException);
    expect(findOneBy).toHaveBeenCalledWith({ nombre: 'Laboratorio 1' });
  });

  it('trims the name and stores a global location without a parent', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const save = vi.fn().mockResolvedValue({ id_ubicacion: 2, nombre: 'Sala 3', padre_id: null } as Ubicacion);
    const create = vi.fn((value: Partial<Ubicacion>) => value as Ubicacion);
    const service = createService({ findOneBy, save, create });

    await service.create({ nombre: '  Sala 3  ' });

    expect(create).toHaveBeenCalledWith({ nombre: 'Sala 3', padre_id: null });
  });

  it('creates a sub-location under a global location', async () => {
    const findOneBy = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id_ubicacion: 2, nombre: 'Sala de clases', padre_id: null } as Ubicacion);
    const save = vi.fn().mockResolvedValue({ id_ubicacion: 7, nombre: '1° Básico A', padre_id: 2 } as Ubicacion);
    const create = vi.fn((value: Partial<Ubicacion>) => value as Ubicacion);
    const service = createService({ findOneBy, save, create });

    await service.create({ nombre: '1° Básico A', padre_id: 2 });

    expect(create).toHaveBeenCalledWith({ nombre: '1° Básico A', padre_id: 2 });
  });

  it('rejects creating a sub-location when the parent does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: '1° Básico A', padre_id: 99 })).rejects.toThrow(NotFoundException);
  });

  it('rejects creating a third nesting level', async () => {
    const findOneBy = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id_ubicacion: 9, nombre: '1° Básico A', padre_id: 2 } as Ubicacion);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: 'Rincón', padre_id: 9 })).rejects.toThrow(ConflictException);
  });

  it('propagates a rename to devices and tickets', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1', padre_id: null } as Ubicacion;
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
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1', padre_id: null } as Ubicacion;
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

  it('generates the standard courses under a global location', async () => {
    const padre = { id_ubicacion: 2, nombre: 'Sala de clases', padre_id: null } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(padre);
    const find = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const save = vi.fn().mockResolvedValue([]);
    const create = vi.fn((value: Partial<Ubicacion>) => value as Ubicacion);
    const service = createService({ findOneBy, find, save, create });

    await service.generateCourses(2);

    expect(create).toHaveBeenCalledTimes(24);
    expect(save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ nombre: '1° Básico A', padre_id: 2 }),
      expect.objectContaining({ nombre: '8° Básico B', padre_id: 2 }),
      expect.objectContaining({ nombre: '4° Medio B', padre_id: 2 }),
    ]));
  });

  it('only creates the courses that are missing', async () => {
    const padre = { id_ubicacion: 2, nombre: 'Sala de clases', padre_id: null } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(padre);
    const existing = [{ id_ubicacion: 10, nombre: '1° Básico A', padre_id: 2 } as Ubicacion];
    const find = vi.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);
    const save = vi.fn().mockResolvedValue([]);
    const create = vi.fn((value: Partial<Ubicacion>) => value as Ubicacion);
    const service = createService({ findOneBy, find, save, create });

    await service.generateCourses(2);

    expect(create).toHaveBeenCalledTimes(23);
  });

  it('rejects generating courses under a sub-location', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_ubicacion: 9, nombre: '1° Básico A', padre_id: 2 } as Ubicacion);
    const service = createService({ findOneBy });

    await expect(service.generateCourses(9)).rejects.toThrow(ConflictException);
  });

  it('blocks deleting a location that has sub-locations', async () => {
    const location = { id_ubicacion: 2, nombre: 'Sala de clases', padre_id: null } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const count = vi.fn().mockResolvedValue(3);
    const remove = vi.fn();
    const service = createService({ findOneBy, count, delete: remove });

    await expect(service.remove(2)).rejects.toThrow(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('blocks deleting a location that still has devices', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1', padre_id: null } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    const remove = vi.fn();
    const service = createService({ findOneBy, count, delete: remove }, { count });

    await expect(service.remove(5)).rejects.toThrow(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a location with no children and no devices', async () => {
    const location = { id_ubicacion: 5, nombre: 'Laboratorio 1', padre_id: null } as Ubicacion;
    const findOneBy = vi.fn().mockResolvedValue(location);
    const count = vi.fn().mockResolvedValue(0);
    const remove = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ findOneBy, count, delete: remove }, { count });

    await service.remove(5);

    expect(remove).toHaveBeenCalledWith({ id_ubicacion: 5 });
  });

  it('rejects deleting a location that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
