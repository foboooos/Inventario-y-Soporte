import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { DeviceStatus } from './device-status.enum.js';
import { DeviceType } from './device-type.enum.js';

@Index('IDX_inventario_estado', ['estado'])
@Index('IDX_inventario_ubicacion', ['id_ubicacion'])
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

  @Column({ name: 'id_ubicacion', type: 'int' })
  id_ubicacion!: number;

  @ManyToOne(() => Ubicacion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_ubicacion', referencedColumnName: 'id_ubicacion', foreignKeyConstraintName: 'FK_inventario_ubicacion' })
  ubicacion_relacion!: Ubicacion;

  @Column({ type: 'enum', enum: DeviceStatus, enumName: 'device_status', default: DeviceStatus.ACTIVO })
  estado!: DeviceStatus;

  @Column({ name: 'fecha_ingreso', type: 'date', default: () => 'CURRENT_DATE' })
  fecha_ingreso!: string;
}
