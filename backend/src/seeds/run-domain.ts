import type { DataSource } from 'typeorm';
import { seedDevices } from './devices.seed.js';
import { seedLevels } from './levels.seed.js';
import { seedLocations } from './locations.seed.js';
import { seedSoftware } from './software.seed.js';
import { seedSubjects } from './subjects.seed.js';

export const SEED_DOMAINS = ['catalogos', 'dispositivos'] as const;
export type SeedDomain = (typeof SEED_DOMAINS)[number];

export function isSeedDomain(value: string | undefined): value is SeedDomain {
  return SEED_DOMAINS.includes(value as SeedDomain);
}

/**
 * Carga por dominio, pensada también para producción.
 * Nunca incluye `seedUsers`: poda usuarios fuera de su padrón y resetea contraseñas.
 */
export async function runDomainSeeds(dataSource: DataSource, domain: SeedDomain): Promise<void> {
  await seedLocations(dataSource);

  if (domain === 'catalogos') {
    await seedLevels(dataSource);
    await seedSubjects(dataSource);
    await seedSoftware(dataSource);
    return;
  }

  await seedDevices(dataSource);
}
