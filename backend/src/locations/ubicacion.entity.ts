import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { LocationType } from './location-type.js';

@Entity({ name: 'ubicaciones' })
export class Ubicacion {
  @PrimaryGeneratedColumn({ name: 'id_ubicacion', type: 'int' })
  id_ubicacion!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 3, nullable: true, unique: true })
  sigla!: string | null;

  @Column({ name: 'padre_id', type: 'int', nullable: true })
  padre_id!: number | null;

  @Column({ type: 'varchar', length: 20, default: 'PRINCIPAL' })
  tipo!: LocationType;
}
