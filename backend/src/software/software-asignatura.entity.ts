import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'software_asignaturas' })
export class SoftwareAsignatura {
  @PrimaryColumn({ name: 'id_software', type: 'int' })
  id_software!: number;

  @PrimaryColumn({ name: 'id_asignatura', type: 'int' })
  id_asignatura!: number;
}
