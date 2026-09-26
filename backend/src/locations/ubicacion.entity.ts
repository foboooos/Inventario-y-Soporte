import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ubicaciones' })
export class Ubicacion {
  @PrimaryGeneratedColumn({ name: 'id_ubicacion', type: 'int' })
  id_ubicacion!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;
}
