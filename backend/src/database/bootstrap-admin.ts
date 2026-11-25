import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { normalizeRut } from '../users/rut.js';

export type BootstrapAdminConfig = {
  rut: string;
  nombre: string;
  email: string;
  password: string;
};

/**
 * Crea el administrador base solo si todavía no existe ninguno.
 * Nunca sobrescribe credenciales ni eleva privilegios de un usuario existente.
 */
export async function bootstrapAdmin(
  connection: DataSource,
  config: BootstrapAdminConfig,
): Promise<'created' | 'existing'> {
  const rut = normalizeRut(config.rut.trim());
  const nombre = config.nombre.trim();
  const email = config.email.trim().toLowerCase();

  if (!rut || !nombre || !email || !config.password) {
    throw new Error('La identidad y la contraseña del administrador base son obligatorias');
  }

  const users = connection.getRepository(User);

  if (await users.findOneBy({ rol: UserRole.ADMIN })) {
    console.log('Ya existe un administrador; no se modificaron credenciales');
    return 'existing';
  }

  const [byRut, byEmail] = await Promise.all([
    users.findOneBy({ rut }),
    users.findOneBy({ email }),
  ]);

  if (byRut || byEmail) {
    throw new Error('El RUT o el email del administrador base ya pertenece a otro usuario');
  }

  await users.save(users.create({
    rut,
    nombre,
    email,
    password_hash: await bcrypt.hash(config.password, 12),
    rol: UserRole.ADMIN,
  }));

  console.log('Administrador base creado');
  return 'created';
}
