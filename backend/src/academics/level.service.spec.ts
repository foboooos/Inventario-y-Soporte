import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { AsignaturaNivel } from './asignatura-nivel.entity.js';
import { LevelService } from './level.service.js';
import { NivelEducativo } from './nivel-educativo.entity.js';

function createService(
  levels: Partial<Repository<NivelEducativo>>,
  assignments: Partial<Repository<AsignaturaNivel>> = {},
) {
  return new LevelService(
    levels as Repository<NivelEducativo>,
    assignments as Repository<AsignaturaNivel>,
  );
}

describe('LevelService', () => {
  it('lists levels ordered by id to preserve creation order', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = createService({ find });

    await service.findAll();

    expect(find).toHaveBeenCalledWith({ order: { id_nivel: 'ASC' } });
  });

  it('rejects creating a level that already exists', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_nivel: 1, nombre: 'Pre-Escolar' } as NivelEducativo);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: '  Pre-Escolar  ' })).rejects.toThrow(ConflictException);
    expect(findOneBy).toHaveBeenCalledWith({ nombre: 'Pre-Escolar' });
  });

  it('trims the name and stores the level', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const save = vi.fn().mockResolvedValue({ id_nivel: 2, nombre: '1° Básico' } as NivelEducativo);
    const create = vi.fn((value: Partial<NivelEducativo>) => value as NivelEducativo);
    const service = createService({ findOneBy, save, create });

    await service.create({ nombre: '  1° Básico  ' });

    expect(create).toHaveBeenCalledWith({ nombre: '1° Básico' });
  });

  it('rejects renaming a level that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.rename(99, { nombre: 'Pre-Escolar' })).rejects.toThrow(NotFoundException);
  });

  it('keeps the level untouched when the name does not change', async () => {
    const level = { id_nivel: 1, nombre: 'Pre-Escolar' } as NivelEducativo;
    const findOneBy = vi.fn().mockResolvedValue(level);
    const save = vi.fn();
    const service = createService({ findOneBy, save });

    const result = await service.rename(1, { nombre: '  Pre-Escolar  ' });

    expect(save).not.toHaveBeenCalled();
    expect(result).toBe(level);
  });

  it('rejects renaming a level to an existing name', async () => {
    const level = { id_nivel: 1, nombre: 'Pre-Escolar' } as NivelEducativo;
    const findOneBy = vi.fn()
      .mockResolvedValueOnce(level)
      .mockResolvedValueOnce({ id_nivel: 2, nombre: 'Básica' } as NivelEducativo);
    const service = createService({ findOneBy });

    await expect(service.rename(1, { nombre: 'Básica' })).rejects.toThrow(ConflictException);
  });

  it('renames a level', async () => {
    const level = { id_nivel: 1, nombre: 'Parvularia' } as NivelEducativo;
    const findOneBy = vi.fn().mockResolvedValueOnce(level).mockResolvedValueOnce(null);
    const save = vi.fn().mockResolvedValue(level);
    const service = createService({ findOneBy, save });

    const result = await service.rename(1, { nombre: ' Pre-Escolar ' });

    expect(save).toHaveBeenCalledWith(level);
    expect(result.nombre).toBe('Pre-Escolar');
  });

  it('blocks deleting a level that is used by subjects', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_nivel: 1, nombre: 'Pre-Escolar' } as NivelEducativo);
    const count = vi.fn().mockResolvedValue(2);
    const remove = vi.fn();
    const service = createService({ findOneBy, delete: remove }, { count });

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a level that is not used by any subject', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_nivel: 1, nombre: 'Pre-Escolar' } as NivelEducativo);
    const count = vi.fn().mockResolvedValue(0);
    const remove = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ findOneBy, delete: remove }, { count });

    await service.remove(1);

    expect(remove).toHaveBeenCalledWith({ id_nivel: 1 });
  });

  it('rejects deleting a level that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
