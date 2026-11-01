import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { normalizeRut } from '../users/rut.js';

type UserSeedBase = { rut: string; nombre: string; email: string };
type SeedUser = UserSeedBase & { rol: UserRole };

/** Credenciales por defecto (se pueden sobreescribir con SEED_ADMIN_* / SEED_TEACHER_*). */
const ADMIN_POR_DEFECTO: UserSeedBase = {
  rut: '12.807.660-3',
  nombre: 'Miguel Ramírez',
  email: 'miguel.ramirez@davincicoquimbo.cl',
};

const DOCENTE_POR_DEFECTO: UserSeedBase = {
  rut: '21.219.278-3',
  nombre: 'Juan Castro',
  email: 'juan.castro@davincicoquimbo.cl',
};

const EQUIPO_TECNICO: UserSeedBase[] = [
  { rut: '14.562.331-8', nombre: 'Carolina Fuentes', email: 'carolina.fuentes@davincicoquimbo.cl' },
  { rut: '17.204.556-1', nombre: 'Sebastián Rojas', email: 'sebastian.rojas@davincicoquimbo.cl' },
];

const DOCENTES: UserSeedBase[] = [
  { rut: '9.876.543-2', nombre: 'Paulina Vega', email: 'paulina.vega@davincicoquimbo.cl' },
  { rut: '10.234.567-8', nombre: 'Andrés Soto', email: 'andres.soto@davincicoquimbo.cl' },
  { rut: '13.345.678-9', nombre: 'María José Herrera', email: 'maria.herrera@davincicoquimbo.cl' },
  { rut: '14.456.789-K', nombre: 'Rodrigo Díaz', email: 'rodrigo.diaz@davincicoquimbo.cl' },
  { rut: '15.567.890-1', nombre: 'Camila Torres', email: 'camila.torres@davincicoquimbo.cl' },
  { rut: '16.678.901-2', nombre: 'Felipe Morales', email: 'felipe.morales@davincicoquimbo.cl' },
  { rut: '18.789.012-3', nombre: 'Valentina Ríos', email: 'valentina.rios@davincicoquimbo.cl' },
  { rut: '19.890.123-4', nombre: 'Ignacio Peña', email: 'ignacio.pena@davincicoquimbo.cl' },
  { rut: '20.901.234-5', nombre: 'Daniela Contreras', email: 'daniela.contreras@davincicoquimbo.cl' },
  { rut: '11.456.789-K', nombre: 'Claudia Sepúlveda', email: 'claudia.sepulveda@davincicoquimbo.cl' },
  { rut: '12.345.678-9', nombre: 'Pedro Salinas', email: 'pedro.salinas@davincicoquimbo.cl' },
  { rut: '13.789.456-1', nombre: 'Andrea Muñoz', email: 'andrea.munoz@davincicoquimbo.cl' },
  { rut: '15.234.678-5', nombre: 'Cristián Espinoza', email: 'cristian.espinoza@davincicoquimbo.cl' },
  { rut: '16.543.210-7', nombre: 'Lorena Pizarro', email: 'lorena.pizarro@davincicoquimbo.cl' },
  { rut: '17.890.123-6', nombre: 'Mauricio Carrasco', email: 'mauricio.carrasco@davincicoquimbo.cl' },
  { rut: '18.234.567-2', nombre: 'Nicole Valdés', email: 'nicole.valdes@davincicoquimbo.cl' },
  { rut: '19.345.678-1', nombre: 'Jorge Mansilla', email: 'jorge.mansilla@davincicoquimbo.cl' },
  { rut: '20.456.789-K', nombre: 'Katherine Silva', email: 'katherine.silva@davincicoquimbo.cl' },
];

/** La contraseña inicial de cada usuario es su RUT sin puntos. */
function passwordFromRut(rut: string): string {
  return rut.replace(/\./g, '');
}

function withEnvOverride(prefix: string, rol: UserRole, fallback: UserSeedBase): SeedUser {
  const rut = process.env[`SEED_${prefix}_RUT`];
  const nombre = process.env[`SEED_${prefix}_NAME`];
  const email = process.env[`SEED_${prefix}_EMAIL`];

  if (rut && nombre && email) {
    return { rut, nombre, email, rol };
  }

  return { ...fallback, rol };
}

export async function seedUsers(dataSource: DataSource): Promise<number> {
  const users = dataSource.getRepository(User);

  const roster: SeedUser[] = [
    withEnvOverride('ADMIN', UserRole.ADMIN, ADMIN_POR_DEFECTO),
    ...EQUIPO_TECNICO.map((user) => ({ ...user, rol: UserRole.TECNICO })),
    withEnvOverride('TEACHER', UserRole.DOCENTE, DOCENTE_POR_DEFECTO),
    ...DOCENTES.map((user) => ({ ...user, rol: UserRole.DOCENTE })),
  ];

  let created = 0;
  let updated = 0;

  for (const user of roster) {
    const rut = normalizeRut(user.rut);
    const email = user.email.trim().toLowerCase();
    const existing = await users.findOne({ where: [{ rut }, { email }] });

    if (existing) {
      if (existing.rut !== rut) {
        await users.update(existing.rut, {
          rut,
          password_hash: await bcrypt.hash(passwordFromRut(rut), 12),
        });
        updated += 1;
      }
      continue;
    }

    await users.save(
      users.create({
        rut,
        nombre: user.nombre.trim(),
        email,
        password_hash: await bcrypt.hash(passwordFromRut(rut), 12),
        rol: user.rol,
      }),
    );
    created += 1;
  }

  console.log(`Usuarios: ${created} creados, ${updated} actualizados (${roster.length} en el padrón)`);

  return created;
}
