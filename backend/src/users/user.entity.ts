import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';
import { UserRole } from './user-role.enum.js';

@Unique('UQ_usuarios_login_id', ['login_id'])
@Entity({ name: 'usuarios' })
export class User {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  rut!: string;

  @Column({ name: 'login_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  login_id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;


  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  password_hash!: string;

  @Column({ name: 'fecha_nacimiento_hash', type: 'varchar', length: 60, nullable: true, select: false })
  fecha_nacimiento_hash!: string | null;

  @Column({ name: 'fecha_nacimiento_cifrada', type: 'varchar', length: 255, nullable: true, select: false })
  fecha_nacimiento_cifrada!: string | null;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  rol!: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;
}
