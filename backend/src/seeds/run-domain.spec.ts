import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./devices.seed.js', () => ({ seedDevices: vi.fn().mockResolvedValue(0) }));
vi.mock('./levels.seed.js', () => ({ seedLevels: vi.fn().mockResolvedValue(0) }));
vi.mock('./locations.seed.js', () => ({ seedLocations: vi.fn().mockResolvedValue(0) }));
vi.mock('./software.seed.js', () => ({ seedSoftware: vi.fn().mockResolvedValue(0) }));
vi.mock('./subjects.seed.js', () => ({ seedSubjects: vi.fn().mockResolvedValue(0) }));

import { seedDevices } from './devices.seed.js';
import { seedLevels } from './levels.seed.js';
import { seedLocations } from './locations.seed.js';
import { isSeedDomain, runDomainSeeds } from './run-domain.js';
import { seedSoftware } from './software.seed.js';
import { seedSubjects } from './subjects.seed.js';

const connection = {} as DataSource;

describe('carga de datos por dominio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga catálogos sin crear dispositivos', async () => {
    await runDomainSeeds(connection, 'catalogos');

    expect(seedLocations).toHaveBeenCalledWith(connection);
    expect(seedLevels).toHaveBeenCalledWith(connection);
    expect(seedSubjects).toHaveBeenCalledWith(connection);
    expect(seedSoftware).toHaveBeenCalledWith(connection);
    expect(seedDevices).not.toHaveBeenCalled();
  });

  it('carga dispositivos sobre las ubicaciones', async () => {
    await runDomainSeeds(connection, 'dispositivos');

    expect(seedLocations).toHaveBeenCalledWith(connection);
    expect(seedDevices).toHaveBeenCalledWith(connection);
    expect(seedLevels).not.toHaveBeenCalled();
    expect(seedSubjects).not.toHaveBeenCalled();
    expect(seedSoftware).not.toHaveBeenCalled();
  });

  it('acepta solo los dominios permitidos', () => {
    expect(isSeedDomain('catalogos')).toBe(true);
    expect(isSeedDomain('dispositivos')).toBe(true);
    expect(isSeedDomain('usuarios')).toBe(false);
    expect(isSeedDomain(undefined)).toBe(false);
  });
});
