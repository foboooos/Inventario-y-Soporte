import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Asignatura } from './asignatura.entity.js';
import { AsignaturaNivel } from './asignatura-nivel.entity.js';
import { NivelEducativo } from './nivel-educativo.entity.js';
import { SubjectService } from './subject.service.js';

function createService(
  subjects: Partial<Repository<Asignatura>>,
  levels: Partial<Repository<NivelEducativo>> = {},
  assignments: Partial<Repository<AsignaturaNivel>> = {},
) {
  return new SubjectService(
    subjects as Repository<Asignatura>,
    levels as Repository<NivelEducativo>,
    assignments as Repository<AsignaturaNivel>,
  );
}

function createManager(handler: (entity: unknown) => unknown) {
  const getRepository = vi.fn(handler);
  const transaction = vi.fn(async (work: (manager: { getRepository: typeof getRepository }) => Promise<unknown>) =>
    work({ getRepository }),
  );

  return { getRepository, transaction };
}

describe('SubjectService', () => {
  it('lists subjects with their level ids', async () => {
    const find = vi.fn().mockResolvedValue([
      { id_asignatura: 1, nombre: 'Matemática' },
      { id_asignatura: 2, nombre: 'Lenguaje' },
    ]);
    const assignmentsFind = vi.fn().mockResolvedValue([
      { id_asignatura: 1, id_nivel: 10 },
      { id_asignatura: 1, id_nivel: 11 },
    ]);
    const service = createService({ find }, {}, { find: assignmentsFind });

    const result = await service.findAll();

    expect(result).toEqual([
      { id_asignatura: 1, nombre: 'Matemática', nivel_ids: [10, 11] },
      { id_asignatura: 2, nombre: 'Lenguaje', nivel_ids: [] },
    ]);
  });

  it('rejects creating a subject that already exists', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_asignatura: 1, nombre: 'Matemática' } as Asignatura);
    const service = createService({ findOneBy });

    await expect(service.create({ nombre: '  Matemática  ' })).rejects.toThrow(ConflictException);
    expect(findOneBy).toHaveBeenCalledWith({ nombre: 'Matemática' });
  });

  it('rejects creating a subject with an unknown level', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const findBy = vi.fn().mockResolvedValue([{ id_nivel: 10 }]);
    const service = createService({ findOneBy }, { findBy });

    await expect(service.create({ nombre: 'Matemática', nivel_ids: [10, 11] })).rejects.toThrow(NotFoundException);
  });

  it('creates a subject together with its levels', async () => {
    const subjectsFindOneBy = vi.fn().mockResolvedValue(null);
    const subjectCreate = vi.fn((value: Partial<Asignatura>) => value as Asignatura);
    const subjectSave = vi.fn().mockResolvedValue({ id_asignatura: 5, nombre: 'Matemática' } as Asignatura);
    const assignmentCreate = vi.fn((value: Partial<AsignaturaNivel>) => value as AsignaturaNivel);
    const assignmentSave = vi.fn().mockResolvedValue([]);
    const { transaction } = createManager((entity) =>
      entity === Asignatura
        ? { create: subjectCreate, save: subjectSave }
        : { create: assignmentCreate, save: assignmentSave },
    );
    const findBy = vi.fn().mockResolvedValue([{ id_nivel: 10 }, { id_nivel: 11 }]);
    const service = createService(
      { findOneBy: subjectsFindOneBy, manager: { transaction } } as unknown as Partial<Repository<Asignatura>>,
      { findBy },
    );

    const result = await service.create({ nombre: 'Matemática', nivel_ids: [10, 11] });

    expect(assignmentSave).toHaveBeenCalledWith([
      expect.objectContaining({ id_asignatura: 5, id_nivel: 10 }),
      expect.objectContaining({ id_asignatura: 5, id_nivel: 11 }),
    ]);
    expect(result).toEqual({ id_asignatura: 5, nombre: 'Matemática', nivel_ids: [10, 11] });
  });

  it('rejects updating a subject that does not exist', async () => {
    const { transaction } = createManager(() => ({ findOneBy: vi.fn().mockResolvedValue(null) }));
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<Asignatura>>);

    await expect(service.update(99, { nombre: 'Matemática' })).rejects.toThrow(NotFoundException);
  });

  it('updates a subject name and replaces its levels', async () => {
    const subject = { id_asignatura: 5, nombre: 'Matemática' } as Asignatura;
    const subjectFindOneBy = vi.fn().mockResolvedValueOnce(subject).mockResolvedValueOnce(null);
    const subjectSave = vi.fn().mockResolvedValue(subject);
    const assignmentFind = vi.fn().mockResolvedValue([{ id_asignatura: 5, id_nivel: 10 }]);
    const assignmentDelete = vi.fn().mockResolvedValue({ affected: 1 });
    const assignmentCreate = vi.fn((value: Partial<AsignaturaNivel>) => value as AsignaturaNivel);
    const assignmentSave = vi.fn().mockResolvedValue([]);
    const { transaction } = createManager((entity) =>
      entity === Asignatura
        ? { findOneBy: subjectFindOneBy, save: subjectSave }
        : { find: assignmentFind, delete: assignmentDelete, create: assignmentCreate, save: assignmentSave },
    );
    const findBy = vi.fn().mockResolvedValue([{ id_nivel: 11 }]);
    const service = createService(
      { manager: { transaction } } as unknown as Partial<Repository<Asignatura>>,
      { findBy },
    );

    const result = await service.update(5, { nombre: 'Matemática Aplicada', nivel_ids: [11] });

    expect(subjectSave).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Matemática Aplicada' }));
    expect(assignmentDelete).toHaveBeenCalledWith({ id_asignatura: 5 });
    expect(assignmentSave).toHaveBeenCalledWith([
      expect.objectContaining({ id_asignatura: 5, id_nivel: 11 }),
    ]);
    expect(result).toEqual({ id_asignatura: 5, nombre: 'Matemática Aplicada', nivel_ids: [11] });
  });

  it('keeps the current levels when nivel_ids is not provided', async () => {
    const subject = { id_asignatura: 5, nombre: 'Matemática' } as Asignatura;
    const subjectFindOneBy = vi.fn().mockResolvedValue(subject);
    const assignmentFind = vi.fn().mockResolvedValue([{ id_asignatura: 5, id_nivel: 10 }]);
    const assignmentDelete = vi.fn();
    const { transaction } = createManager((entity) =>
      entity === Asignatura
        ? { findOneBy: subjectFindOneBy, save: vi.fn() }
        : { find: assignmentFind, delete: assignmentDelete, create: vi.fn(), save: vi.fn() },
    );
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<Asignatura>>);

    const result = await service.update(5, {});

    expect(assignmentDelete).not.toHaveBeenCalled();
    expect(result).toEqual({ id_asignatura: 5, nombre: 'Matemática', nivel_ids: [10] });
  });

  it('deletes a subject and its level and software assignments', async () => {
    const subjectDelete = vi.fn().mockResolvedValue({ affected: 1 });
    const assignmentDelete = vi.fn().mockResolvedValue({ affected: 2 });
    const softwareDelete = vi.fn().mockResolvedValue({ affected: 1 });
    const { transaction } = createManager((entity) => {
      if (entity === Asignatura) return { delete: subjectDelete };
      if (entity === AsignaturaNivel) return { delete: assignmentDelete };
      return { delete: softwareDelete };
    });
    const service = createService({
      findOneBy: vi.fn().mockResolvedValue({ id_asignatura: 5, nombre: 'Matemática' } as Asignatura),
      manager: { transaction },
    } as unknown as Partial<Repository<Asignatura>>);

    await service.remove(5);

    expect(assignmentDelete).toHaveBeenCalledWith({ id_asignatura: 5 });
    expect(softwareDelete).toHaveBeenCalledWith({ id_asignatura: 5 });
    expect(subjectDelete).toHaveBeenCalledWith({ id_asignatura: 5 });
  });

  it('rejects deleting a subject that does not exist', async () => {
    const service = createService({ findOneBy: vi.fn().mockResolvedValue(null) });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
