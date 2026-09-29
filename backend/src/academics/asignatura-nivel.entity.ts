import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'asignatura_niveles' })
export class AsignaturaNivel {
  @PrimaryColumn({ name: 'id_asignatura', type: 'int' })
  id_asignatura!: number;

  @PrimaryColumn({ name: 'id_nivel', type: 'int' })
  id_nivel!: number;
}
