import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Asignatura } from './asignatura.entity.js';
import { NivelEducativo } from './nivel-educativo.entity.js';

@Entity({ name: 'asignatura_niveles' })
export class AsignaturaNivel {
  @PrimaryColumn({ name: 'id_asignatura', type: 'int' })
  id_asignatura!: number;

  @ManyToOne(() => Asignatura, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_asignatura', referencedColumnName: 'id_asignatura', foreignKeyConstraintName: 'FK_asignatura_niveles_asignatura' })
  asignatura!: Asignatura;

  @PrimaryColumn({ name: 'id_nivel', type: 'int' })
  id_nivel!: number;

  @ManyToOne(() => NivelEducativo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_nivel', referencedColumnName: 'id_nivel', foreignKeyConstraintName: 'FK_asignatura_niveles_nivel' })
  nivel!: NivelEducativo;
}
