import { DataSource } from 'typeorm';
import { Asignatura } from '../academics/asignatura.entity.js';
import { AsignaturaNivel } from '../academics/asignatura-nivel.entity.js';
import { NivelEducativo } from '../academics/nivel-educativo.entity.js';
import { ensure } from './seed-utils.js';

type LevelMatcher = (nombre: string) => boolean;

const todas: LevelMatcher = () => true;
const basica: LevelMatcher = (nombre) =>
  nombre === 'Pre-Kinder' || nombre === 'Kinder' || nombre.includes('Básico');
const mediaDesde = (grado: number): LevelMatcher => (nombre) => {
  const match = /^(\d)° Medio/.exec(nombre);
  return match ? Number(match[1]) >= grado : false;
};

type SubjectDef = {
  nombre: string;
  niveles: LevelMatcher;
};

/** Plan de estudios de la institución (básica y media). */
export const ASIGNATURAS: SubjectDef[] = [
  { nombre: 'Lenguaje y Comunicación', niveles: todas },
  { nombre: 'Matemática', niveles: todas },
  { nombre: 'Ciencias Naturales', niveles: basica },
  { nombre: 'Historia, Geografía y Ciencias Sociales', niveles: todas },
  { nombre: 'Inglés', niveles: todas },
  { nombre: 'Educación Física y Salud', niveles: todas },
  { nombre: 'Artes Visuales', niveles: basica },
  { nombre: 'Música', niveles: basica },
  { nombre: 'Tecnología', niveles: todas },
  { nombre: 'Orientación', niveles: todas },
  { nombre: 'Religión', niveles: todas },
  { nombre: 'Filosofía', niveles: mediaDesde(3) },
  { nombre: 'Educación Ciudadana', niveles: mediaDesde(3) },
  { nombre: 'Ciencias para la Ciudadanía', niveles: mediaDesde(3) },
  { nombre: 'Biología', niveles: mediaDesde(3) },
  { nombre: 'Física', niveles: mediaDesde(3) },
  { nombre: 'Química', niveles: mediaDesde(3) },
];

export async function seedSubjects(dataSource: DataSource): Promise<{ created: number; links: number }> {
  const subjects = dataSource.getRepository(Asignatura);
  const assignments = dataSource.getRepository(AsignaturaNivel);
  const levels = dataSource.getRepository(NivelEducativo);
  const allLevels = await levels.find();

  let created = 0;
  let links = 0;

  for (const def of ASIGNATURAS) {
    const { entity: subject, created: isNew } = await ensure(subjects, { nombre: def.nombre }, { nombre: def.nombre });
    if (isNew) created += 1;

    const wanted = allLevels
      .filter((level) => def.niveles(level.nombre))
      .map((level) => level.id_nivel);

    const current = new Set(
      (await assignments.find({ where: { id_asignatura: subject.id_asignatura } })).map(
        (assignment) => assignment.id_nivel,
      ),
    );

    const toAdd = wanted.filter((idNivel) => !current.has(idNivel));

    if (toAdd.length > 0) {
      await assignments.save(
        toAdd.map((idNivel) => assignments.create({ id_asignatura: subject.id_asignatura, id_nivel: idNivel })),
      );
      links += toAdd.length;
    }
  }

  console.log(`Asignaturas: ${created} creadas, ${links} vínculos con niveles`);

  return { created, links };
}
