import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { User } from '../users/user.entity.js';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { TicketStatus } from './ticket-status.enum.js';
import { TicketSequence } from './ticket-sequence.entity.js';

@Index('IDX_tickets_solicitante_fecha', ['id_solicitante', 'fecha_creacion'])
@Index('IDX_tickets_tecnico', ['id_tecnico'])
@Index('IDX_tickets_estado_estado_final_fecha', ['estado', 'estado_final', 'fecha_creacion'])
@Index('IDX_tickets_fecha_creacion', ['fecha_creacion'])
@Index('IDX_tickets_ubicacion_fecha', ['id_ubicacion', 'fecha_creacion'])
@Entity({ name: 'tickets_soporte' })
export class Ticket {
  @PrimaryGeneratedColumn({ name: 'id_ticket', type: 'int' })
  id_ticket!: number;

  @Column({ name: 'codigo_ticket', type: 'varchar', length: 30, unique: true })
  codigo_ticket!: string;

  @Column({ name: 'id_solicitante', type: 'varchar', length: 12 })
  id_solicitante!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_solicitante', referencedColumnName: 'rut', foreignKeyConstraintName: 'FK_tickets_solicitante' })
  solicitante!: User;

  @Column({ name: 'id_tecnico', type: 'varchar', length: 12, nullable: true })
  id_tecnico!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_tecnico', referencedColumnName: 'rut', foreignKeyConstraintName: 'FK_tickets_tecnico' })
  tecnico!: User | null;

  @Column({ name: 'id_dispositivo', type: 'int', nullable: true })
  id_dispositivo!: number | null;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_dispositivo', referencedColumnName: 'id_dispositivo', foreignKeyConstraintName: 'FK_tickets_dispositivo' })
  dispositivo!: Device | null;

  @Column({ name: 'id_ubicacion', type: 'int' })
  id_ubicacion!: number;

  @ManyToOne(() => Ubicacion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_ubicacion', referencedColumnName: 'id_ubicacion', foreignKeyConstraintName: 'FK_tickets_ubicacion' })
  ubicacion_relacion!: Ubicacion;

  @Column({ name: 'anio_ticket', type: 'int' })
  anio_ticket!: number;

  @ManyToOne(() => TicketSequence, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'anio_ticket', referencedColumnName: 'anio', foreignKeyConstraintName: 'FK_tickets_secuencia' })
  secuencia!: TicketSequence;

  @Column({ type: 'text' })
  sintoma!: string;

  @Column({ type: 'text', nullable: true })
  causa_raiz!: string | null;

  @Column({ type: 'text', nullable: true })
  solucion_aplicada!: string | null;

  @Column({ type: 'enum', enum: TicketStatus, enumName: 'ticket_status', default: TicketStatus.ABIERTO })
  estado!: TicketStatus;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fecha_resolucion!: Date | null;

  @Column({ name: 'tecnico_nombre', type: 'varchar', length: 100, nullable: true })
  tecnico_nombre!: string | null;

  @Column({ type: 'enum', enum: DeviceStatus, enumName: 'device_status', nullable: true })
  estado_final!: DeviceStatus | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fecha_creacion!: Date;
}
