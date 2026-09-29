import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'asignaturas' })
export class Asignatura {
  @PrimaryGeneratedColumn({ name: 'id_asignatura', type: 'int' })
  id_asignatura!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;
}
