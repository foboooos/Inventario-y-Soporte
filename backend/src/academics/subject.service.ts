import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Asignatura } from './asignatura.entity.js';
import { AsignaturaNivel } from './asignatura-nivel.entity.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { NivelEducativo } from './nivel-educativo.entity.js';

type SubjectResponse = {
  id_asignatura: number;
  nombre: string;
  nivel_ids: number[];
};

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Asignatura) private readonly subjects: Repository<Asignatura>,
    @InjectRepository(NivelEducativo) private readonly levels: Repository<NivelEducativo>,
    @InjectRepository(AsignaturaNivel) private readonly assignments: Repository<AsignaturaNivel>,
  ) {}

  async findAll(): Promise<SubjectResponse[]> {
    const [subjects, assignments] = await Promise.all([
      this.subjects.find({ order: { id_asignatura: 'ASC' } }),
      this.assignments.find(),
    ]);

    const levelIdsBySubject = new Map<number, number[]>();

    for (const assignment of assignments) {
      const levelIds = levelIdsBySubject.get(assignment.id_asignatura) ?? [];
      levelIds.push(assignment.id_nivel);
      levelIdsBySubject.set(assignment.id_asignatura, levelIds);
    }

    return subjects.map((subject) => ({
      id_asignatura: subject.id_asignatura,
      nombre: subject.nombre,
      nivel_ids: levelIdsBySubject.get(subject.id_asignatura) ?? [],
    }));
  }

  async create(createSubjectDto: CreateSubjectDto): Promise<SubjectResponse> {
    const nombre = createSubjectDto.nombre.trim();
    const existing = await this.subjects.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('La asignatura ya existe');
    }

    const levelIds = await this.resolveLevelIds(createSubjectDto.nivel_ids);

    return this.subjects.manager.transaction(async (manager) => {
      const subjects = manager.getRepository(Asignatura);
      const assignments = manager.getRepository(AsignaturaNivel);
      const subject = await subjects.save(subjects.create({ nombre }));

      await this.saveAssignments(assignments, subject.id_asignatura, levelIds);

      return { id_asignatura: subject.id_asignatura, nombre: subject.nombre, nivel_ids: levelIds };
    });
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto): Promise<SubjectResponse> {
    return this.subjects.manager.transaction(async (manager) => {
      const subjects = manager.getRepository(Asignatura);
      const assignments = manager.getRepository(AsignaturaNivel);
      const subject = await subjects.findOneBy({ id_asignatura: id });

      if (!subject) {
        throw new NotFoundException('La asignatura no existe');
      }

      const nombre = updateSubjectDto.nombre?.trim();

      if (nombre && nombre !== subject.nombre) {
        const duplicate = await subjects.findOneBy({ nombre });

        if (duplicate) {
          throw new ConflictException('La asignatura ya existe');
        }

        subject.nombre = nombre;
        await subjects.save(subject);
      }

      let levelIds = (await assignments.find({ where: { id_asignatura: id } })).map(
        (assignment) => assignment.id_nivel,
      );

      if (updateSubjectDto.nivel_ids !== undefined) {
        levelIds = await this.resolveLevelIds(updateSubjectDto.nivel_ids);

        await assignments.delete({ id_asignatura: id });
        await this.saveAssignments(assignments, subject.id_asignatura, levelIds);
      }

      return { id_asignatura: subject.id_asignatura, nombre: subject.nombre, nivel_ids: levelIds };
    });
  }

  async remove(id: number) {
    const subject = await this.subjects.findOneBy({ id_asignatura: id });

    if (!subject) {
      throw new NotFoundException('La asignatura no existe');
    }

    await this.subjects.manager.transaction(async (manager) => {
      await manager.getRepository(AsignaturaNivel).delete({ id_asignatura: id });
      await manager.getRepository(Asignatura).delete({ id_asignatura: id });
    });
  }

  private async resolveLevelIds(nivelIds?: number[]): Promise<number[]> {
    if (!nivelIds || nivelIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(nivelIds)];
    const found = await this.levels.findBy({ id_nivel: In(uniqueIds) });

    if (found.length !== uniqueIds.length) {
      throw new NotFoundException('Uno o más niveles educativos no existen');
    }

    return uniqueIds;
  }

  private async saveAssignments(
    assignments: Repository<AsignaturaNivel>,
    idAsignatura: number,
    levelIds: number[],
  ) {
    if (levelIds.length === 0) {
      return;
    }

    await assignments.save(
      levelIds.map((idNivel) => assignments.create({ id_asignatura: idAsignatura, id_nivel: idNivel })),
    );
  }
}
