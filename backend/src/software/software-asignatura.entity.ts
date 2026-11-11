import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Asignatura } from '../academics/asignatura.entity.js';
import { SoftwareEducativo } from './software-educativo.entity.js';

@Entity({ name: 'software_asignaturas' })
export class SoftwareAsignatura {
  @PrimaryColumn({ name: 'id_software', type: 'int' })
  id_software!: number;

  @ManyToOne(() => SoftwareEducativo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_software', referencedColumnName: 'id_software', foreignKeyConstraintName: 'FK_software_asignaturas_software' })
  software!: SoftwareEducativo;

  @PrimaryColumn({ name: 'id_asignatura', type: 'int' })
  id_asignatura!: number;

  @ManyToOne(() => Asignatura, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_asignatura', referencedColumnName: 'id_asignatura', foreignKeyConstraintName: 'FK_software_asignaturas_asignatura' })
  asignatura!: Asignatura;
}
