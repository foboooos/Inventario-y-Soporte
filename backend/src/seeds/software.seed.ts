import { DataSource } from 'typeorm';
import { Asignatura } from '../academics/asignatura.entity.js';
import { SoftwareAsignatura } from '../software/software-asignatura.entity.js';
import { SoftwareEducativo } from '../software/software-educativo.entity.js';
import { SoftwareLicense } from '../software/software-license.enum.js';
import { ensure } from './seed-utils.js';

type SoftwareDef = {
  nombre: string;
  version: string;
  licencia: SoftwareLicense;
  asignaturas: string[];
};

/** Software educativo y licencias utilizadas por la institución. */
export const SOFTWARE: SoftwareDef[] = [
  { nombre: 'Microsoft 365 Education', version: 'A3', licencia: SoftwareLicense.SUSCRIPCION, asignaturas: [] },
  { nombre: 'Google Workspace for Education', version: 'Standard', licencia: SoftwareLicense.SUSCRIPCION, asignaturas: [] },
  { nombre: 'GeoGebra', version: '6.0', licencia: SoftwareLicense.LIBRE, asignaturas: ['Matemática'] },
  { nombre: 'Khan Academy', version: 'Online', licencia: SoftwareLicense.GRATUITA, asignaturas: ['Matemática', 'Ciencias Naturales'] },
  { nombre: 'PhET Interactive Simulations', version: '1.0', licencia: SoftwareLicense.LIBRE, asignaturas: ['Ciencias Naturales', 'Física', 'Química', 'Biología'] },
  { nombre: 'Scratch', version: '3.0', licencia: SoftwareLicense.LIBRE, asignaturas: ['Tecnología'] },
  { nombre: 'Minecraft Education', version: '1.21', licencia: SoftwareLicense.SUSCRIPCION, asignaturas: ['Tecnología'] },
  { nombre: 'LibreOffice', version: '24.8', licencia: SoftwareLicense.LIBRE, asignaturas: ['Tecnología'] },
  { nombre: 'GIMP', version: '2.10', licencia: SoftwareLicense.LIBRE, asignaturas: ['Artes Visuales'] },
  { nombre: 'Canva for Education', version: 'Online', licencia: SoftwareLicense.FREEMIUM, asignaturas: ['Artes Visuales', 'Tecnología'] },
  { nombre: 'Audacity', version: '3.6', licencia: SoftwareLicense.LIBRE, asignaturas: ['Música'] },
  { nombre: 'Duolingo for Schools', version: 'Online', licencia: SoftwareLicense.FREEMIUM, asignaturas: ['Inglés'] },
  { nombre: 'Adobe Creative Cloud', version: '2024', licencia: SoftwareLicense.COMERCIAL, asignaturas: ['Artes Visuales'] },
  { nombre: 'Zoom Workplace', version: '6.1', licencia: SoftwareLicense.SUSCRIPCION, asignaturas: [] },
  { nombre: 'ESET Endpoint Security', version: '11', licencia: SoftwareLicense.COMERCIAL, asignaturas: [] },
  { nombre: 'VLC Media Player', version: '3.0', licencia: SoftwareLicense.LIBRE, asignaturas: [] },
];

export async function seedSoftware(dataSource: DataSource): Promise<{ created: number; links: number }> {
  const software = dataSource.getRepository(SoftwareEducativo);
  const links = dataSource.getRepository(SoftwareAsignatura);
  const subjects = dataSource.getRepository(Asignatura);
  const subjectsByName = new Map((await subjects.find()).map((subject) => [subject.nombre, subject.id_asignatura]));

  let created = 0;
  let linkCount = 0;

  for (const def of SOFTWARE) {
    const { entity: program, created: isNew } = await ensure(
      software,
      { nombre: def.nombre },
      { nombre: def.nombre, version: def.version, licencia: def.licencia },
    );
    if (isNew) created += 1;

    const wanted = def.asignaturas
      .map((nombre) => subjectsByName.get(nombre))
      .filter((id): id is number => id !== undefined);

    const current = new Set(
      (await links.find({ where: { id_software: program.id_software } })).map((link) => link.id_asignatura),
    );

    const toAdd = wanted.filter((idAsignatura) => !current.has(idAsignatura));

    if (toAdd.length > 0) {
      await links.save(
        toAdd.map((idAsignatura) => links.create({ id_software: program.id_software, id_asignatura: idAsignatura })),
      );
      linkCount += toAdd.length;
    }
  }

  console.log(`Software educativo: ${created} creados, ${linkCount} vínculos con asignaturas`);

  return { created, links: linkCount };
}
