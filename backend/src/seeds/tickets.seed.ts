import { DataSource } from 'typeorm';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { TicketSequence } from '../tickets/ticket-sequence.entity.js';
import { TicketStatus } from '../tickets/ticket-status.enum.js';
import { formatTicketCode } from '../tickets/ticket-code.js';
import { User } from '../users/user.entity.js';
import { normalizeRut } from '../users/rut.js';

type SeedTicket = {
  /** Se asigna en el padrón de abajo, alternando entre los docentes nuevos. */
  solicitante?: string;
  ubicacion?: string;
  sintoma: string;
  estado: TicketStatus;
  causa_raiz?: string;
  solucion_aplicada?: string;
  tecnico_nombre?: string;
};

/** Docentes incorporados para poblar la bandeja; los tickets alternan entre ellos. */
const SOLICITANTES = [
  '11.456.789-K',
  '12.345.678-9',
  '13.789.456-1',
  '15.234.678-5',
  '16.543.210-7',
  '17.890.123-6',
  '18.234.567-2',
  '19.345.678-1',
  '20.456.789-K',
];

/**
 * Redactados como los escribiría un docente: sin tildes, con errores de
 * ortografía y sin diagnóstico técnico.
 */
const TICKETS: SeedTicket[] = [
  {
    ubicacion: 'Biblioteca CRA',
    sintoma: 'no me puedo conectar al wifi del colegio, me dice que la contraseña es incorrecta y a los demas si les funciona',
    estado: TicketStatus.ABIERTO,
  },
  {
    ubicacion: 'Sala PIE',
    sintoma: 'no puedo entrar a la plataforma de notas, dice que mi usuario no existe y ayer si entraba',
    estado: TicketStatus.EN_PROCESO,
  },
  {
    ubicacion: 'Patio Cubierto',
    sintoma: 'el wifi del patio no llega a la sala de al lado, se corta cuando los alumnos entran',
    estado: TicketStatus.ABIERTO,
  },
  {
    ubicacion: 'Laboratorio de Computación',
    sintoma: 'no hay internet en el laboratorio, los computadores tienen la red pero no navegan',
    estado: TicketStatus.ABIERTO,
  },
].map((ticket, index) => ({ ...ticket, solicitante: SOLICITANTES[index % SOLICITANTES.length] }));

function buildCreatedAt(index: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - (TICKETS.length - index) * 2);
  date.setHours(8 + (index % 8), (index * 7) % 60, 0, 0);
  return date;
}

export async function seedTickets(dataSource: DataSource): Promise<number> {
  const tickets = dataSource.getRepository(Ticket);
  const users = dataSource.getRepository(User);
  const sequences = dataSource.getRepository(TicketSequence);
  const year = new Date().getFullYear();

  const legacyTickets = await tickets
    .createQueryBuilder('ticket')
    .where("ticket.id_solicitante LIKE '%-0'")
    .getMany();

  for (const ticket of legacyTickets) {
    const normalized = normalizeRut(ticket.id_solicitante);
    if (normalized !== ticket.id_solicitante) {
      await tickets.update(ticket.id_ticket, { id_solicitante: normalized });
    }
  }

  await sequences
    .createQueryBuilder()
    .insert()
    .into(TicketSequence)
    .values({ anio: year, ultimo_numero: 0 })
    .orIgnore()
    .execute();

  let created = 0;

  for (const [index, seed] of TICKETS.entries()) {
    if (await tickets.findOneBy({ sintoma: seed.sintoma })) {
      continue;
    }

    const requester = await users.findOneBy({ rut: seed.solicitante });
    if (!requester) {
      console.warn(`Ticket omitido: no existe el usuario ${seed.solicitante}`);
      continue;
    }

    const sequence = await sequences.findOneBy({ anio: year });
    if (!sequence) {
      break;
    }

    sequence.ultimo_numero += 1;
    await sequences.save(sequence);

    const createdAt = buildCreatedAt(index);
    const resolvedAt = seed.estado === TicketStatus.RESUELTO
      ? new Date(createdAt.getTime() + 6 * 60 * 60 * 1000)
      : null;

    const saved = await tickets.save(
      tickets.create({
        codigo_ticket: formatTicketCode(year, sequence.ultimo_numero),
        id_solicitante: requester.rut,
        id_dispositivo: null,
        ubicacion: seed.ubicacion ?? '',
        sintoma: seed.sintoma,
        estado: seed.estado,
        causa_raiz: seed.causa_raiz ?? null,
        solucion_aplicada: seed.solucion_aplicada ?? null,
        tecnico_nombre: seed.tecnico_nombre ?? null,
        fecha_resolucion: resolvedAt,
        estado_final: resolvedAt ? DeviceStatus.ACTIVO : null,
      }),
    );

    await tickets.update({ id_ticket: saved.id_ticket }, { fecha_creacion: createdAt });
    created += 1;
  }

  console.log(`Tickets: ${created} creados (${TICKETS.length} en el padrón)`);

  return created;
}
