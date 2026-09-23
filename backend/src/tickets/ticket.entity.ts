import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { TicketStatus } from './ticket-status.enum.js';

@Entity({ name: 'tickets_soporte' })
export class Ticket {
  @PrimaryGeneratedColumn({ name: 'id_ticket', type: 'int' })
  id_ticket!: number;

  @Column({ name: 'codigo_ticket', type: 'varchar', length: 30, unique: true })
  codigo_ticket!: string;

  @Column({ name: 'id_solicitante', type: 'varchar', length: 12 })
  id_solicitante!: string;

  @Column({ name: 'id_dispositivo', type: 'int', nullable: true })
  id_dispositivo!: number | null;

  @Column({ type: 'varchar', length: 100 })
  ubicacion!: string;

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
