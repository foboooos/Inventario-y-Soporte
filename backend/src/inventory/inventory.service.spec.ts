import { FindOperator, type Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { DeviceStatus } from './device-status.enum.js';
import { Device } from './device.entity.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { InventoryService } from './inventory.service.js';

function query(overrides: Partial<QueryInventoryDto> = {}): QueryInventoryDto {
  return { page: 1, limit: 10, sortBy: 'code', sortDir: 'asc', ...overrides };
}

function createService(devices: Partial<Repository<Device>>) {
  return new InventoryService(devices as Repository<Device>);
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
});
