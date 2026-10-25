import { DataSource } from 'typeorm';
import { Device } from '../inventory/device.entity.js';
import { DeviceStatus } from '../inventory/device-status.enum.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { TicketSequence } from '../tickets/ticket-sequence.entity.js';
import { TicketStatus } from '../tickets/ticket-status.enum.js';
import { formatTicketCode } from '../tickets/ticket-code.js';
import { User } from '../users/user.entity.js';

type SeedTicket = {
  /** Se asigna en el padrón de abajo, alternando entre los docentes nuevos. */
  solicitante?: string;
  dispositivo: string | null;
  ubicacion?: string;
  sintoma: string;
  estado: TicketStatus;
  causa_raiz?: string;
  solucion_aplicada?: string;
  tecnico_nombre?: string;
};

/** Docentes incorporados para poblar la bandeja; los tickets alternan entre ellos. */
const SOLICITANTES = [
  '11.456.789-0',
  '12.345.678-9',
  '13.789.456-1',
  '15.234.678-5',
  '16.543.210-7',
  '17.890.123-6',
  '18.234.567-2',
  '19.345.678-1',
  '20.456.789-0',
];

/**
 * Redactados como los escribiría un docente: sin tildes, con errores de
 * ortografía y sin diagnóstico técnico.
 */
const TICKETS: SeedTicket[] = [
  {
    dispositivo: 'IMP-PRO-01',
    sintoma: 'la impresora de la sala de profes no imprime, prende la luz pero no saca nada y los papeles quedan con rayas',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PRY-3BA',
    sintoma: 'el proyector se ve la imagen pero no tiene sonido, los niños no escuchan el video de ciencias',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PC-LAB-05',
    sintoma: 'el computador 5 esta muy lento, se pega cuando abro power point y tengo que reiniciarlo',
    estado: TicketStatus.EN_PROCESO,
  },
  {
    dispositivo: null,
    ubicacion: 'Biblioteca CRA',
    sintoma: 'no me puedo conectar al wifi del colegio, me dice que la contraseña es incorrecta y a los demas si les funciona',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PRY-1BA',
    sintoma: 'el proyector no prende, queda la luz roja nomas y no sale imagen',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PC-CIE-03',
    sintoma: 'la pantalla se apaga sola cada rato y tengo que mover el cable de atras',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'IMP-BIB-01',
    sintoma: 'dice que no tiene papel pero la bandeja esta llena, no se que pasa',
    estado: TicketStatus.EN_PROCESO,
  },
  {
    dispositivo: 'PC-LAB-12',
    sintoma: 'el mouse no hace click, tengo que apretarlo muy fuerte y aveces no toma',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PC-ADM-04',
    sintoma: 'el teclado no escribe la letra a, tube que escribir todo con el de la pantalla',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PRY-2MB',
    sintoma: 'el proyector se escucha con interferencia, como un ruido de fondo que no deja escuchar',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: null,
    ubicacion: 'Sala PIE',
    sintoma: 'no puedo entrar a la plataforma de notas, dice que mi usuario no existe y ayer si entraba',
    estado: TicketStatus.EN_PROCESO,
  },
  {
    dispositivo: 'PC-LAB-20',
    sintoma: 'se reinicia solo el computador cuando entro a internet, ya van 3 veces hoy',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'IMP-SEC-01',
    sintoma: 'la impresora imprime todo por un lado no mas, no puedo sacar a doble cara',
    estado: TicketStatus.RESUELTO,
    causa_raiz: 'La opción de impresión a doble cara estaba desactivada en el controlador de la impresora.',
    solucion_aplicada: 'Se habilitó el dúplex en el controlador y se dejó como predeterminado en el equipo de Secretaría.',
    tecnico_nombre: 'Carolina Fuentes',
  },
  {
    dispositivo: 'PC-ADM-05',
    sintoma: 'el pendrive no lo reconose, lo pongo y no pasa nada, lo probe en otro compu y si anda',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'AP-PAT-01',
    sintoma: 'el wifi del patio no llega a la sala de al lado, se corta cuando los alumnos entran',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PC-CIE-01',
    sintoma: 'me sale una pantalla azul cuando abro el programa de matematicas y se pierde todo',
    estado: TicketStatus.EN_PROCESO,
  },
  {
    dispositivo: 'SW-LAB-01',
    sintoma: 'no hay internet en el laboratorio, los computadores tienen la red pero no navegan',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'IMP-ADM-01',
    sintoma: 'la impresora saca las hojas arrugadas y a veces se come 2 papelos juntos',
    estado: TicketStatus.RESUELTO,
    causa_raiz: 'Rodillo de arrastre desgastado y humedad en el block de hojas.',
    solucion_aplicada: 'Se cambió el rodillo de arrastre y se reemplazó el block de papel por uno nuevo sellado.',
    tecnico_nombre: 'Sebastián Rojas',
  },
  {
    dispositivo: 'PC-LAB-01',
    sintoma: 'el audio de los audifonos se escucha de un solo lado, el otro no suena nada',
    estado: TicketStatus.ABIERTO,
  },
  {
    dispositivo: 'PRY-LAB',
    sintoma: 'la luz del proyector esta muy debil, con las cortinas abiertas no se ve bien la pantalla',
    estado: TicketStatus.RESUELTO,
    causa_raiz: 'Lámpara del proyector con más de 4000 horas de uso.',
    solucion_aplicada: 'Se reemplazó la lámpara y se limpió el filtro de aire.',
    tecnico_nombre: 'Carolina Fuentes',
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
  const devices = dataSource.getRepository(Device);
  const sequences = dataSource.getRepository(TicketSequence);
  const year = new Date().getFullYear();

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

    const device = seed.dispositivo
      ? await devices.findOneBy({ codigo_inventario: seed.dispositivo })
      : null;

    if (seed.dispositivo && !device) {
      console.warn(`Ticket omitido: no existe el dispositivo ${seed.dispositivo}`);
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
        id_dispositivo: device?.id_dispositivo ?? null,
        ubicacion: device?.ubicacion ?? seed.ubicacion ?? '',
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
