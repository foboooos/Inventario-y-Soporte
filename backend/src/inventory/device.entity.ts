import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeviceStatus } from './device-status.enum.js';
import { DeviceType } from './device-type.enum.js';

@Entity({ name: 'inventario' })
export class Device {
  @PrimaryGeneratedColumn({ name: 'id_dispositivo', type: 'int' })
  id_dispositivo!: number;

  @Column({ name: 'codigo_inventario', type: 'varchar', length: 50, unique: true })
  codigo_inventario!: string;

  @Column({ type: 'enum', enum: DeviceType, enumName: 'device_type' })
  tipo!: DeviceType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  marca!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelo!: string | null;

  @Column({ type: 'varchar', length: 100 })
  ubicacion!: string;

  @Column({ type: 'enum', enum: DeviceStatus, enumName: 'device_status', default: DeviceStatus.ACTIVO })
  estado!: DeviceStatus;

  @Column({ name: 'fecha_ingreso', type: 'date', default: () => 'CURRENT_DATE' })
  fecha_ingreso!: string;
}
