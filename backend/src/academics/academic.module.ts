import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Asignatura } from './asignatura.entity.js';
import { AsignaturaNivel } from './asignatura-nivel.entity.js';
import { LevelController } from './level.controller.js';
import { LevelService } from './level.service.js';
import { NivelEducativo } from './nivel-educativo.entity.js';
import { SubjectController } from './subject.controller.js';
import { SubjectService } from './subject.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([NivelEducativo, Asignatura, AsignaturaNivel])],
  controllers: [LevelController, SubjectController],
  providers: [LevelService, SubjectService],
})
export class AcademicModule {}
