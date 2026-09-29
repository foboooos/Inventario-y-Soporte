import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'niveles_educativos' })
export class NivelEducativo {
  @PrimaryGeneratedColumn({ name: 'id_nivel', type: 'int' })
  id_nivel!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;
}
