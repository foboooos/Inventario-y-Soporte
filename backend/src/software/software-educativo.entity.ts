import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SoftwareLicense } from './software-license.enum.js';

@Entity({ name: 'software_educativo' })
export class SoftwareEducativo {
  @PrimaryGeneratedColumn({ name: 'id_software', type: 'int' })
  id_software!: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 50 })
  version!: string;

  @Column({ type: 'enum', enum: SoftwareLicense, enumName: 'software_licencia' })
  licencia!: SoftwareLicense;
}
