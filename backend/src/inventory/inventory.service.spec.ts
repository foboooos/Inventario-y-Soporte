import { FindOperator, type Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { DeviceStatus } from './device-status.enum.js';
import { DeviceType } from './device-type.enum.js';
import { Device } from './device.entity.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import { InventoryService } from './inventory.service.js';

function query(overrides: Partial<QueryInventoryDto> = {}): QueryInventoryDto {
  return { page: 1, limit: 10, sortBy: 'code', sortDir: 'asc', ...overrides };
}

function createService(
  devices: Partial<Repository<Device>>,
  locations: Partial<Repository<Ubicacion>> = {},
  tickets: Partial<Repository<Ticket>> = {},
) {
  const repositories = new Map<unknown, unknown>([
    [Device, devices],
    [Ubicacion, locations],
    [Ticket, tickets],
  ]);

  if (!devices.manager) {
    Object.assign(devices, {
      manager: {
        transaction: <T>(work: (manager: { getRepository: (entity: unknown) => unknown }) => Promise<T>) =>
          work({ getRepository: (entity) => repositories.get(entity) }),
      },
    });
  }

  return new InventoryService(
    devices as Repository<Device>,
    locations as Repository<Ubicacion>,
    tickets as Repository<Ticket>,
  );
}

function createQueryBuilder(rawRows: Array<{ estado: string; count: string }>) {
  return {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawRows),
  };
}

describe('InventoryService', () => {
  it('returns the requested page without filters and defaults to code ascending', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    const result = await service.findAll(query());

    expect(findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { codigo_inventario: 'ASC', id_dispositivo: 'ASC' },
      skip: 0,
      take: 10,
    });
    expect(result).toMatchObject({ data: [], total: 0, page: 1, limit: 10, total_pages: 1 });
  });

  it('searches case-insensitively across code, brand, model and location', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    await service.findAll(query({ search: 'Acme' }));

    const { where } = findAndCount.mock.calls[0][0] as { where: Array<Record<string, unknown>> };
    expect(Array.isArray(where)).toBe(true);
    expect(where).toHaveLength(4);

    const columns = where.flatMap((condition) => Object.keys(condition));
    expect(columns).toEqual(expect.arrayContaining(['codigo_inventario', 'marca', 'modelo', 'ubicacion']));

    const codeCondition = where.find((condition) => 'codigo_inventario' in condition)!;
    const operator = codeCondition.codigo_inventario as FindOperator<string>;
    expect(operator).toBeInstanceOf(FindOperator);
    expect(operator.type).toBe('ilike');
    expect(operator.value).toBe('%Acme%');
  });

  it('combines the search with the state filter in every condition', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    await service.findAll(query({ search: 'pc', estado: DeviceStatus.ACTIVO }));

    const { where } = findAndCount.mock.calls[0][0] as { where: Array<Record<string, unknown>> };
    expect(where.every((condition) => condition.estado === DeviceStatus.ACTIVO)).toBe(true);
  });

  it('filters by state alone when there is no search', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    await service.findAll(query({ estado: DeviceStatus.BAJA_TECNICA }));

    const { where } = findAndCount.mock.calls[0][0] as { where: unknown };
    expect(where).toEqual({ estado: DeviceStatus.BAJA_TECNICA });
  });

  it('divides the results in the database using skip and take', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 42]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    const result = await service.findAll(query({ page: 3, limit: 5 }));

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 5 }));
    expect(result).toMatchObject({ total: 42, page: 3, limit: 5, total_pages: 9 });
  });

  it('sorts by the requested column and direction', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    await service.findAll(query({ sortBy: 'location', sortDir: 'desc' }));

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      order: { ubicacion: 'DESC', id_dispositivo: 'ASC' },
    }));
  });

  it('summarizes the matching devices by state, ignoring the state filter', async () => {
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const qb = createQueryBuilder([
      { estado: DeviceStatus.ACTIVO, count: '2' },
      { estado: DeviceStatus.INACTIVO, count: '1' },
      { estado: DeviceStatus.BAJA_TECNICA, count: '3' },
    ]);
    const service = createService({ findAndCount, createQueryBuilder: vi.fn().mockReturnValue(qb) });

    const result = await service.findAll(query({ search: 'lab', estado: DeviceStatus.ACTIVO }));

    expect(qb.groupBy).toHaveBeenCalledWith('device.estado');
    expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('ILIKE :pattern'), { pattern: '%lab%' });
    expect(qb.where).not.toHaveBeenCalledWith(expect.stringContaining('estado'), expect.anything());
    expect(result.summary).toEqual({ total: 6, activo: 2, inactivo: 1, baja_tecnica: 3 });
  });

  it('generates the next code from the device count of the location', async () => {
    const find = vi.fn().mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        codigo_inventario: `PC-LAB-${String(index + 1).padStart(4, '0')}`,
      })),
    );
    const service = createService(
      { find },
      {
        findOneBy: vi.fn().mockResolvedValue({
          nombre: 'Laboratorio de Computación',
          sigla: 'LAB',
          padre_id: null,
        }),
      },
    );

    await expect(service.nextCode(DeviceType.PC, 'Laboratorio de Computación')).resolves.toBe('PC-LAB-0011');
  });

  it('groups all courses under the CUR sigla', async () => {
    const find = vi.fn().mockResolvedValue([{ codigo_inventario: 'PRY-CUR-0001' }]);
    const service = createService(
      { find },
      {
        findOneBy: vi.fn().mockResolvedValue({ nombre: '1° Básico A', sigla: null, padre_id: 3 }),
        find: vi.fn().mockResolvedValue([
          { nombre: '1° Básico A', padre_id: 3 },
          { nombre: '1° Básico B', padre_id: 3 },
        ]),
      },
    );

    await expect(service.nextCode(DeviceType.PROYECTOR, '1° Básico A')).resolves.toBe('PRY-CUR-0002');
  });

  it('rejects locations without a sigla', async () => {
    const service = createService(
      {},
      { findOneBy: vi.fn().mockResolvedValue({ nombre: 'Casino', sigla: null, padre_id: null }) },
    );

    await expect(service.nextCode(DeviceType.PC, 'Casino')).rejects.toThrow('La ubicación no tiene sigla configurada');
  });

  it('removes a device and unlinks its tickets', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_dispositivo: 5 });
    const deleteDevice = vi.fn().mockResolvedValue({ affected: 1 });
    const updateTickets = vi.fn().mockResolvedValue({ affected: 2 });
    const service = createService({ findOneBy, delete: deleteDevice }, {}, { update: updateTickets });

    await service.remove(5);

    expect(updateTickets).toHaveBeenCalledWith({ id_dispositivo: 5 }, { id_dispositivo: null });
    expect(deleteDevice).toHaveBeenCalledWith({ id_dispositivo: 5 });
  });

  it('rejects removing a device that does not exist', async () => {
    const service = createService({ findOneBy: vi.fn().mockResolvedValue(null) });

    await expect(service.remove(99)).rejects.toThrow('Dispositivo no encontrado');
  });

  it('rejects updating a device to a location that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_dispositivo: 5 } as Device);
    const service = createService(
      { findOneBy },
      { findOneBy: vi.fn().mockResolvedValue(null) },
    );

    await expect(service.update(5, { ubicacion: 'Ubicación inexistente' } as UpdateDeviceDto))
      .rejects.toThrow('La ubicación no existe');
  });

  it('updates a device when the new location exists', async () => {
    const device = {
      id_dispositivo: 5,
      tipo: 'PC',
      ubicacion: 'Laboratorio 1',
      codigo_inventario: 'PC-LAB-0001',
    } as Device;
    const findOneBy = vi.fn().mockResolvedValue(device);
    const find = vi.fn().mockResolvedValue([]);
    const save = vi.fn().mockResolvedValue(device);
    const service = createService(
      { findOneBy, find, save },
      { findOneBy: vi.fn().mockResolvedValue({ nombre: 'Laboratorio 2', sigla: 'LAB2', padre_id: null }) },
    );

    await service.update(5, { ubicacion: 'Laboratorio 2' } as UpdateDeviceDto);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      ubicacion: 'Laboratorio 2',
      codigo_inventario: 'PC-LAB2-0001',
    }));
  });

  it('regenerates the code when only the device type changes', async () => {
    const device = {
      id_dispositivo: 5,
      tipo: 'PC',
      ubicacion: 'Laboratorio 1',
      codigo_inventario: 'PC-LAB-0001',
    } as Device;
    const findOneBy = vi.fn().mockResolvedValue(device);
    const find = vi.fn().mockResolvedValue([]);
    const save = vi.fn().mockResolvedValue(device);
    const service = createService(
      { findOneBy, find, save },
      { findOneBy: vi.fn().mockResolvedValue({ nombre: 'Laboratorio 1', sigla: 'LAB', padre_id: null }) },
    );

    await service.update(5, { tipo: 'PROYECTOR' } as UpdateDeviceDto);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'PROYECTOR',
      codigo_inventario: 'PRY-LAB-0001',
    }));
  });
});
