import { DataSource } from 'typeorm';
import { buildCourseNames } from '../locations/course-names.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { ensure } from './seed-utils.js';

/** Espacios físicos de la institución (ubicaciones de primer nivel). */
export const ESPACIOS = [
  { nombre: 'Salas de Clases', sigla: 'SAL' },
  { nombre: 'Laboratorio de Computación', sigla: 'LAB' },
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

export async function seedLocations(dataSource: DataSource): Promise<number> {
  const locations = dataSource.getRepository(Ubicacion);
  let created = 0;

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
