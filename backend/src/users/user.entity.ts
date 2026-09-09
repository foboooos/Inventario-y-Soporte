import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { UserRole } from './user-role.enum.js';

@Entity({ name: 'usuarios' })
export class User {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  rut!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;


  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  password_hash!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  rol!: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;
}
