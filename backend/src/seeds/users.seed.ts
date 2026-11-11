import * as bcrypt from 'bcrypt';
import { DataSource, In } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { normalizeRut } from '../users/rut.js';

type UserSeedBase = { rut: string; nombre: string; email: string };
type SeedUser = UserSeedBase & { rol: UserRole };

/** Credenciales por defecto (se pueden sobreescribir con SEED_ADMIN_* / SEED_TEACHER_*). */
const ADMIN_POR_DEFECTO: UserSeedBase = {
  rut: '12.345.678-9',
  nombre: 'Miguel Ramírez',
  email: 'miguel.ramirez@davincicoquimbo.cl',
};

const DOCENTE_POR_DEFECTO: UserSeedBase = {
  rut: '21.219.278-3',
  nombre: 'Juan Castro',
  email: 'juan.castro@davincicoquimbo.cl',
};

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
  const roster: SeedUser[] = [
    withEnvOverride('ADMIN', UserRole.ADMIN, ADMIN_POR_DEFECTO),
    withEnvOverride('TEACHER', UserRole.DOCENTE, DOCENTE_POR_DEFECTO),
  ];

  let created = 0;
  let updated = 0;

  await dataSource.transaction(async (manager) => {
    const users = manager.getRepository(User);
    const tickets = manager.getRepository(Ticket);
    const keepEmails = new Set(roster.map((user) => user.email.trim().toLowerCase()));
    const obsolete = (await users.find()).filter((user) => !keepEmails.has(user.email.toLowerCase()));
    const obsoleteRuts = obsolete.map((user) => user.rut);

    if (obsoleteRuts.length > 0) {
      const referencedTickets = await tickets.count({ where: { id_solicitante: In(obsoleteRuts) } });

      if (referencedTickets > 0) {
        throw new Error(`No se pueden quitar usuarios del seed: ${referencedTickets} ticket(s) pertenecen a usuarios fuera del padrón`);
      }

      await users.delete({ rut: In(obsoleteRuts) });
    }

    for (const user of roster) {
      const rut = normalizeRut(user.rut);
      const email = user.email.trim().toLowerCase();
      const existing = await users.findOneBy({ email });

      if (existing) {
        if (existing.rut !== rut) {
          const duplicateRut = await users.findOneBy({ rut });
          if (duplicateRut) throw new Error(`El RUT ${rut} ya está asignado a otro usuario del padrón`);

          await tickets.update({ id_solicitante: existing.rut }, { id_solicitante: rut });
          await users.update(existing.rut, {
            rut,
            password_hash: await bcrypt.hash(passwordFromRut(rut), 12),
          });
          updated += 1;
        }
        continue;
      }

      const duplicateRut = await users.findOneBy({ rut });
      if (duplicateRut) throw new Error(`El RUT ${rut} ya está asignado a otro usuario del padrón`);

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
  });

  console.log(`Usuarios: ${created} creados, ${updated} actualizados; padrón limitado a ${roster.length} usuarios`);

  return created;
}
