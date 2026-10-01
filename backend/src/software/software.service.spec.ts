import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Asignatura } from '../academics/asignatura.entity.js';
import { SoftwareAsignatura } from './software-asignatura.entity.js';
import { SoftwareEducativo } from './software-educativo.entity.js';
import { SoftwareLicense } from './software-license.enum.js';
import { SoftwareService } from './software.service.js';

function createService(
  software: Partial<Repository<SoftwareEducativo>>,
  subjects: Partial<Repository<Asignatura>> = {},
  links: Partial<Repository<SoftwareAsignatura>> = {},
) {
  return new SoftwareService(
    software as Repository<SoftwareEducativo>,
    subjects as Repository<Asignatura>,
    links as Repository<SoftwareAsignatura>,
  );
}

function createManager(handler: (entity: unknown) => unknown) {
  const getRepository = vi.fn(handler);
  const transaction = vi.fn(async (work: (manager: { getRepository: typeof getRepository }) => Promise<unknown>) =>
    work({ getRepository }),
  );

  return { getRepository, transaction };
}

describe('SoftwareService', () => {
  it('lists programs with their asignatura ids', async () => {
    const find = vi.fn().mockResolvedValue([
      { id_software: 1, nombre: 'GeoGebra', version: '6.0', licencia: SoftwareLicense.LIBRE },
      { id_software: 2, nombre: 'Matific', version: '3.2', licencia: SoftwareLicense.SUSCRIPCION },
    ]);
    const linksFind = vi.fn().mockResolvedValue([
      { id_software: 1, id_asignatura: 10 },
      { id_software: 1, id_asignatura: 11 },
    ]);
    const service = createService({ find }, {}, { find: linksFind });

    const result = await service.findAll();

    expect(result).toEqual([
      { id_software: 1, nombre: 'GeoGebra', version: '6.0', licencia: 'LIBRE', asignatura_ids: [10, 11] },
      { id_software: 2, nombre: 'Matific', version: '3.2', licencia: 'SUSCRIPCION', asignatura_ids: [] },
    ]);
  });

  it('rejects creating software that already exists', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ id_software: 1, nombre: 'GeoGebra' } as SoftwareEducativo);
    const service = createService({ findOneBy });

    await expect(
      service.create({ nombre: '  GeoGebra  ', version: '6.0', licencia: SoftwareLicense.LIBRE }),
    ).rejects.toThrow(ConflictException);
    expect(findOneBy).toHaveBeenCalledWith({ nombre: 'GeoGebra' });
  });

  it('rejects creating software with an unknown asignatura', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const findBy = vi.fn().mockResolvedValue([{ id_asignatura: 10 }]);
    const service = createService({ findOneBy }, { findBy });

    await expect(
      service.create({
        nombre: 'GeoGebra',
        version: '6.0',
        licencia: SoftwareLicense.LIBRE,
        asignatura_ids: [10, 11],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates software together with its asignaturas', async () => {
    const softwareFindOneBy = vi.fn().mockResolvedValue(null);
    const softwareCreate = vi.fn((value: Partial<SoftwareEducativo>) => value as SoftwareEducativo);
    const softwareSave = vi.fn().mockResolvedValue({
      id_software: 5,
      nombre: 'GeoGebra',
      version: '6.0',
      licencia: SoftwareLicense.LIBRE,
    } as SoftwareEducativo);
    const linkCreate = vi.fn((value: Partial<SoftwareAsignatura>) => value as SoftwareAsignatura);
    const linkSave = vi.fn().mockResolvedValue([]);
    const { transaction } = createManager((entity) =>
      entity === SoftwareEducativo
        ? { create: softwareCreate, save: softwareSave }
        : { create: linkCreate, save: linkSave },
    );
    const findBy = vi.fn().mockResolvedValue([{ id_asignatura: 10 }, { id_asignatura: 11 }]);
    const service = createService(
      { findOneBy: softwareFindOneBy, manager: { transaction } } as unknown as Partial<Repository<SoftwareEducativo>>,
      { findBy },
    );

    const result = await service.create({
      nombre: 'GeoGebra',
      version: '6.0',
      licencia: SoftwareLicense.LIBRE,
      asignatura_ids: [10, 11],
    });

    expect(linkSave).toHaveBeenCalledWith([
      expect.objectContaining({ id_software: 5, id_asignatura: 10 }),
      expect.objectContaining({ id_software: 5, id_asignatura: 11 }),
    ]);
    expect(result).toEqual({
      id_software: 5,
      nombre: 'GeoGebra',
      version: '6.0',
      licencia: 'LIBRE',
      asignatura_ids: [10, 11],
    });
  });

  it('rejects updating software that does not exist', async () => {
    const { transaction } = createManager(() => ({ findOneBy: vi.fn().mockResolvedValue(null) }));
    const service = createService({ manager: { transaction } } as unknown as Partial<Repository<SoftwareEducativo>>);

    await expect(service.update(99, { nombre: 'GeoGebra' })).rejects.toThrow(NotFoundException);
  });

  it('updates software fields and replaces its asignaturas', async () => {
    const program = {
      id_software: 5,
      nombre: 'GeoGebra',
      version: '6.0',
      licencia: SoftwareLicense.LIBRE,
    } as SoftwareEducativo;
    const softwareFindOneBy = vi.fn().mockResolvedValueOnce(program).mockResolvedValueOnce(null);
    const softwareSave = vi.fn().mockResolvedValue(program);
    const linksFind = vi.fn().mockResolvedValue([{ id_software: 5, id_asignatura: 10 }]);
    const linksDelete = vi.fn().mockResolvedValue({ affected: 1 });
    const linkCreate = vi.fn((value: Partial<SoftwareAsignatura>) => value as SoftwareAsignatura);
    const linkSave = vi.fn().mockResolvedValue([]);
    const { transaction } = createManager((entity) =>
      entity === SoftwareEducativo
        ? { findOneBy: softwareFindOneBy, save: softwareSave }
        : { find: linksFind, delete: linksDelete, create: linkCreate, save: linkSave },
    );
    const findBy = vi.fn().mockResolvedValue([{ id_asignatura: 11 }]);
    const service = createService(
      { manager: { transaction } } as unknown as Partial<Repository<SoftwareEducativo>>,
      { findBy },
    );

    const result = await service.update(5, {
      nombre: 'GeoGebra Clásico',
      version: '6.1',
      licencia: SoftwareLicense.GRATUITA,
      asignatura_ids: [11],
    });

    expect(softwareSave).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'GeoGebra Clásico', version: '6.1', licencia: 'GRATUITA' }),
    );
    expect(linksDelete).toHaveBeenCalledWith({ id_software: 5 });
    expect(result).toEqual({
      id_software: 5,
      nombre: 'GeoGebra Clásico',
      version: '6.1',
      licencia: 'GRATUITA',
      asignatura_ids: [11],
    });
  });

  it('deletes software and its asignatura links', async () => {
    const programDelete = vi.fn().mockResolvedValue({ affected: 1 });
    const linkDelete = vi.fn().mockResolvedValue({ affected: 2 });
    const { transaction } = createManager((entity) =>
      entity === SoftwareEducativo ? { delete: programDelete } : { delete: linkDelete },
    );
    const service = createService({
      findOneBy: vi.fn().mockResolvedValue({ id_software: 5, nombre: 'GeoGebra' } as SoftwareEducativo),
      manager: { transaction },
    } as unknown as Partial<Repository<SoftwareEducativo>>);

    await service.remove(5);

    expect(linkDelete).toHaveBeenCalledWith({ id_software: 5 });
    expect(programDelete).toHaveBeenCalledWith({ id_software: 5 });
  });

  it('rejects deleting software that does not exist', async () => {
    const service = createService({ findOneBy: vi.fn().mockResolvedValue(null) });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
