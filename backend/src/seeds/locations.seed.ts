import { DataSource } from 'typeorm';
import { buildCourseNames } from '../locations/course-names.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { Device } from '../inventory/device.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { ensure } from './seed-utils.js';

/** Espacios físicos de la institución (ubicaciones de primer nivel). */
export const ESPACIOS = [
  { nombre: 'Salas de Clases', sigla: 'SAL' },
  { nombre: 'Lab. Computación 1', sigla: 'LC1' },
  { nombre: 'Lab. Computación 2', sigla: 'LC2' },
  { nombre: 'Laboratorio de Ciencias', sigla: 'CIE' },
  { nombre: 'Biblioteca CRA', sigla: 'BIB' },
  { nombre: 'Sala de Profesores', sigla: 'PRO' },
  { nombre: 'Sala PIE', sigla: 'PIE' },
  { nombre: 'Dirección', sigla: 'DIR' },
  { nombre: 'Secretaría', sigla: 'SEC' },
  { nombre: 'Administración', sigla: 'ADM' },
  { nombre: 'Casino', sigla: 'CAS' },
  { nombre: 'Gimnasio', sigla: 'GIM' },
  { nombre: 'Patio Cubierto', sigla: 'PAT' },
  { nombre: 'Portería', sigla: 'POR' },
];

/** Padre bajo el cual se crean los cursos (1° Básico A, 2° Medio B, ...). */
export const CURSOS_PADRE = 'Salas de Clases';

const LEGACY_COMPUTER_LAB = 'Laboratorio de Computación';
const COMPUTER_LAB_1 = 'Lab. Computación 1';

async function renameLegacyComputerLab(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const locations = manager.getRepository(Ubicacion);
    const devices = manager.getRepository(Device);
    const tickets = manager.getRepository(Ticket);
    const legacy = await locations.findOneBy({ nombre: LEGACY_COMPUTER_LAB });

    if (!legacy) return;

    const current = await locations.findOneBy({ nombre: COMPUTER_LAB_1 });

    if (current) {
      await locations.update({ padre_id: legacy.id_ubicacion }, { padre_id: current.id_ubicacion });
      await devices.update({ id_ubicacion: legacy.id_ubicacion }, { id_ubicacion: current.id_ubicacion });
      await tickets.update({ id_ubicacion: legacy.id_ubicacion }, { id_ubicacion: current.id_ubicacion });
      await locations.delete({ id_ubicacion: legacy.id_ubicacion });
      return;
    }

    await locations.update(
      { id_ubicacion: legacy.id_ubicacion },
      { nombre: COMPUTER_LAB_1, sigla: 'LC1' },
    );
  });
}

export async function seedLocations(dataSource: DataSource): Promise<number> {
  const locations = dataSource.getRepository(Ubicacion);
  let created = 0;

  await renameLegacyComputerLab(dataSource);

  for (const espacio of ESPACIOS) {
    const result = await ensure(
      locations,
      { nombre: espacio.nombre },
      { nombre: espacio.nombre, sigla: espacio.sigla, padre_id: null, tipo: 'PRINCIPAL' },
    );
    if (result.created) created += 1;
  }

  const parent = await locations.findOneBy({ nombre: CURSOS_PADRE });

  if (parent) {
    for (const nombre of buildCourseNames()) {
      const result = await ensure(locations, { nombre }, { nombre, sigla: null, padre_id: parent.id_ubicacion, tipo: 'SECUNDARIA' });
      if (result.created) created += 1;
    }
  }

  console.log(`Ubicaciones: ${created} creadas`);

  return created;
}
