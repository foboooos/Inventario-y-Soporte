import { DataSource } from 'typeorm';
import { buildCourseNames } from '../locations/course-names.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { ensure } from './seed-utils.js';

/** Espacios físicos de la institución (ubicaciones de primer nivel). */
export const ESPACIOS = [
  'Salas de Clases',
  'Laboratorio de Computación',
  'Laboratorio de Ciencias',
  'Biblioteca CRA',
  'Sala de Profesores',
  'Sala PIE',
  'Dirección',
  'Secretaría',
  'Administración',
  'Casino',
  'Gimnasio',
  'Patio Cubierto',
  'Portería',
];

/** Padre bajo el cual se crean los cursos (1° Básico A, 2° Medio B, ...). */
export const CURSOS_PADRE = 'Salas de Clases';

export async function seedLocations(dataSource: DataSource): Promise<number> {
  const locations = dataSource.getRepository(Ubicacion);
  let created = 0;

  for (const nombre of ESPACIOS) {
    const result = await ensure(locations, { nombre }, { nombre, padre_id: null });
    if (result.created) created += 1;
  }

  const parent = await locations.findOneBy({ nombre: CURSOS_PADRE });

  if (parent) {
    for (const nombre of buildCourseNames()) {
      const result = await ensure(locations, { nombre }, { nombre, padre_id: parent.id_ubicacion });
      if (result.created) created += 1;
    }
  }

  console.log(`Ubicaciones: ${created} creadas`);

  return created;
}
