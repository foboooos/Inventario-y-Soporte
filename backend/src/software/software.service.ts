import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Asignatura } from '../academics/asignatura.entity.js';
import { CreateSoftwareDto } from './dto/create-software.dto.js';
import { UpdateSoftwareDto } from './dto/update-software.dto.js';
import { SoftwareAsignatura } from './software-asignatura.entity.js';
import { SoftwareEducativo } from './software-educativo.entity.js';
import { SoftwareLicense } from './software-license.enum.js';

type SoftwareResponse = {
  id_software: number;
  nombre: string;
  version: string;
  licencia: SoftwareLicense;
  asignatura_ids: number[];
};

@Injectable()
export class SoftwareService {
  constructor(
    @InjectRepository(SoftwareEducativo) private readonly software: Repository<SoftwareEducativo>,
    @InjectRepository(Asignatura) private readonly subjects: Repository<Asignatura>,
    @InjectRepository(SoftwareAsignatura) private readonly links: Repository<SoftwareAsignatura>,
  ) {}

  async findAll(): Promise<SoftwareResponse[]> {
    const [programs, links] = await Promise.all([
      this.software.find({ order: { id_software: 'ASC' } }),
      this.links.find(),
    ]);

    const asignaturaIdsByProgram = new Map<number, number[]>();

    for (const link of links) {
      const asignaturaIds = asignaturaIdsByProgram.get(link.id_software) ?? [];
      asignaturaIds.push(link.id_asignatura);
      asignaturaIdsByProgram.set(link.id_software, asignaturaIds);
    }

    return programs.map((program) => ({
      id_software: program.id_software,
      nombre: program.nombre,
      version: program.version,
      licencia: program.licencia,
      asignatura_ids: asignaturaIdsByProgram.get(program.id_software) ?? [],
    }));
  }

  async create(createSoftwareDto: CreateSoftwareDto): Promise<SoftwareResponse> {
    const nombre = createSoftwareDto.nombre.trim();
    const version = createSoftwareDto.version.trim();
    const existing = await this.software.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('El software ya existe');
    }

    const asignaturaIds = await this.resolveAsignaturaIds(createSoftwareDto.asignatura_ids);

    return this.software.manager.transaction(async (manager) => {
      const software = manager.getRepository(SoftwareEducativo);
      const links = manager.getRepository(SoftwareAsignatura);
      const program = await software.save(
        software.create({ nombre, version, licencia: createSoftwareDto.licencia }),
      );

      await this.saveLinks(links, program.id_software, asignaturaIds);

      return {
        id_software: program.id_software,
        nombre: program.nombre,
        version: program.version,
        licencia: program.licencia,
        asignatura_ids: asignaturaIds,
      };
    });
  }

  async update(id: number, updateSoftwareDto: UpdateSoftwareDto): Promise<SoftwareResponse> {
    return this.software.manager.transaction(async (manager) => {
      const software = manager.getRepository(SoftwareEducativo);
      const links = manager.getRepository(SoftwareAsignatura);
      const program = await software.findOneBy({ id_software: id });

      if (!program) {
        throw new NotFoundException('El software no existe');
      }

      const nombre = updateSoftwareDto.nombre?.trim();

      if (nombre && nombre !== program.nombre) {
        const duplicate = await software.findOneBy({ nombre });

        if (duplicate) {
          throw new ConflictException('El software ya existe');
        }

        program.nombre = nombre;
      }

      const version = updateSoftwareDto.version?.trim();

      if (version) {
        program.version = version;
      }

      if (updateSoftwareDto.licencia) {
        program.licencia = updateSoftwareDto.licencia;
      }

      await software.save(program);

      let asignaturaIds = (await links.find({ where: { id_software: id } })).map(
        (link) => link.id_asignatura,
      );

      if (updateSoftwareDto.asignatura_ids !== undefined) {
        asignaturaIds = await this.resolveAsignaturaIds(updateSoftwareDto.asignatura_ids);

        await links.delete({ id_software: id });
        await this.saveLinks(links, program.id_software, asignaturaIds);
      }

      return {
        id_software: program.id_software,
        nombre: program.nombre,
        version: program.version,
        licencia: program.licencia,
        asignatura_ids: asignaturaIds,
      };
    });
  }

  async remove(id: number) {
    const program = await this.software.findOneBy({ id_software: id });

    if (!program) {
      throw new NotFoundException('El software no existe');
    }

    await this.software.manager.transaction(async (manager) => {
      await manager.getRepository(SoftwareAsignatura).delete({ id_software: id });
      await manager.getRepository(SoftwareEducativo).delete({ id_software: id });
    });
  }

  private async resolveAsignaturaIds(asignaturaIds?: number[]): Promise<number[]> {
    if (!asignaturaIds || asignaturaIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(asignaturaIds)];
    const found = await this.subjects.findBy({ id_asignatura: In(uniqueIds) });

    if (found.length !== uniqueIds.length) {
      throw new NotFoundException('Una o más asignaturas no existen');
    }

    return uniqueIds;
  }

  private async saveLinks(
    links: Repository<SoftwareAsignatura>,
    idSoftware: number,
    asignaturaIds: number[],
  ) {
    if (asignaturaIds.length === 0) {
      return;
    }

    await links.save(
      asignaturaIds.map((idAsignatura) =>
        links.create({ id_software: idSoftware, id_asignatura: idAsignatura }),
      ),
    );
  }
}
