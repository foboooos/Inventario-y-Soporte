import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asignatura } from '../academics/asignatura.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { SoftwareAsignatura } from './software-asignatura.entity.js';
import { SoftwareController } from './software.controller.js';
import { SoftwareEducativo } from './software-educativo.entity.js';
import { SoftwareService } from './software.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([SoftwareEducativo, Asignatura, SoftwareAsignatura])],
  controllers: [SoftwareController],
  providers: [SoftwareService],
})
export class SoftwareModule {}
