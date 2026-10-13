import { DataSource } from 'typeorm';
import { buildEducationalLevelNames } from '../academics/educational-level-names.js';
import { NivelEducativo } from '../academics/nivel-educativo.entity.js';
import { ensure } from './seed-utils.js';

export async function seedLevels(dataSource: DataSource): Promise<number> {
  const levels = dataSource.getRepository(NivelEducativo);
  let created = 0;

  for (const nombre of buildEducationalLevelNames()) {
    const result = await ensure(levels, { nombre }, { nombre });
    if (result.created) created += 1;
  }

  console.log(`Niveles educativos: ${created} creados`);

  return created;
}
