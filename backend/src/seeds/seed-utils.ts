import type { DeepPartial, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/**
 * Inserta la entidad solo si no existe ya (idempotente).
 * Busca por `where` y, si no la encuentra, la crea con `create`.
 */
export async function ensure<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  create: DeepPartial<T>,
): Promise<{ entity: T; created: boolean }> {
  const existing = await repository.findOne({ where });

  if (existing) {
    return { entity: existing, created: false };
  }

  const entity = await repository.save(repository.create(create));

  return { entity, created: true };
}
