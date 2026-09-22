import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'secuencias_ticket' })
export class TicketSequence {
  @PrimaryColumn({ name: 'anio', type: 'int' })
  anio!: number;

  @Column({ name: 'ultimo_numero', type: 'int', default: 0 })
  ultimo_numero!: number;
}
