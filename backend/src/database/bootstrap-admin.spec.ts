import * as bcrypt from 'bcrypt';
import type { DataSource, Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { bootstrapAdmin } from './bootstrap-admin.js';

const config = {
  rut: '12.345.678-9',
  nombre: 'Miguel Ramírez',
  email: 'miguel.ramirez@davincicoquimbo.cl',
  password: '12345678-9',
};

function setup(findOneBy: Repository<User>['findOneBy']) {
  const save = vi.fn().mockImplementation(async (user: User) => user);
  const create = vi.fn().mockImplementation((user: Partial<User>) => user as User);
  const repository = { findOneBy, create, save } as unknown as Repository<User>;
  const connection = { getRepository: vi.fn().mockReturnValue(repository) } as unknown as DataSource;

  return { connection, create, save };
}

describe('bootstrap del administrador base', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea el administrador con la contraseña hasheada', async () => {
    const { connection, create, save } = setup(vi.fn().mockResolvedValue(null));

    await expect(bootstrapAdmin(connection, config)).resolves.toBe('created');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      rut: config.rut,
      nombre: config.nombre,
      email: config.email,
      rol: UserRole.ADMIN,
    }));
    const { password_hash } = save.mock.calls[0][0] as User;
    expect(password_hash).not.toBe(config.password);
    expect(await bcrypt.compare(config.password, password_hash)).toBe(true);
  });

  it('no modifica nada si ya existe un administrador', async () => {
    const existing = { rut: 'otro', rol: UserRole.ADMIN } as User;
    const { connection, save } = setup(vi.fn().mockResolvedValue(existing));

    await expect(bootstrapAdmin(connection, config)).resolves.toBe('existing');

    expect(save).not.toHaveBeenCalled();
  });

  it('rechaza crear el administrador si el RUT o el email ya están en uso', async () => {
    const findOneBy = vi.fn().mockImplementation(async (where: Record<string, unknown>) => (
      where.rut ? { rut: config.rut } : null
    ));
    const { connection, save } = setup(findOneBy as Repository<User>['findOneBy']);

    await expect(bootstrapAdmin(connection, config))
      .rejects.toThrow('ya pertenece a otro usuario');

    expect(save).not.toHaveBeenCalled();
  });

  it('rechaza una configuración incompleta', async () => {
    const { connection } = setup(vi.fn().mockResolvedValue(null));

    await expect(bootstrapAdmin(connection, { ...config, password: '' }))
      .rejects.toThrow('obligatorias');
    await expect(bootstrapAdmin(connection, { ...config, nombre: '' }))
      .rejects.toThrow('obligatorias');
  });
});
