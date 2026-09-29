import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AsignaturaNivel } from './asignatura-nivel.entity.js';
import { CreateLevelDto } from './dto/create-level.dto.js';
import { UpdateLevelDto } from './dto/update-level.dto.js';
import { NivelEducativo } from './nivel-educativo.entity.js';

@Injectable()
export class LevelService {
  constructor(
    @InjectRepository(NivelEducativo) private readonly levels: Repository<NivelEducativo>,
    @InjectRepository(AsignaturaNivel) private readonly assignments: Repository<AsignaturaNivel>,
  ) {}

  findAll() {
    return this.levels.find({ order: { id_nivel: 'ASC' } });
  }

  async create(createLevelDto: CreateLevelDto) {
    const nombre = createLevelDto.nombre.trim();
    const existing = await this.levels.findOneBy({ nombre });

    if (existing) {
      throw new ConflictException('El nivel educativo ya existe');
    }

    return this.levels.save(this.levels.create({ nombre }));
  }

  async rename(id: number, updateLevelDto: UpdateLevelDto) {
    const level = await this.levels.findOneBy({ id_nivel: id });

    if (!level) {
      throw new NotFoundException('El nivel educativo no existe');
    }

    const nombre = updateLevelDto.nombre?.trim();

    if (!nombre || nombre === level.nombre) {
      return level;
    }

    const duplicate = await this.levels.findOneBy({ nombre });

    if (duplicate) {
      throw new ConflictException('El nivel educativo ya existe');
    }

    level.nombre = nombre;

    return this.levels.save(level);
  }

  async remove(id: number) {
    const level = await this.levels.findOneBy({ id_nivel: id });

    if (!level) {
      throw new NotFoundException('El nivel educativo no existe');
    }

    const assignmentsCount = await this.assignments.count({ where: { id_nivel: id } });

    if (assignmentsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el nivel educativo: ${assignmentsCount} asignatura(s) lo utilizan`,
      );
    }

    await this.levels.delete({ id_nivel: id });
  }
}
