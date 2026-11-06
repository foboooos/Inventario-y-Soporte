import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../users/user-role.enum.js';
import type { User } from '../users/user.entity.js';
import { AuthService } from './auth.service.js';

const password = 'secreta123';
const user = {
  rut: '12.345.678-9',
  nombre: 'Ana Pérez',
  email: 'ana.perez@colegio.cl',
  rol: UserRole.DOCENTE,
};

function createService(userRecord: typeof user | null, passwordHash: string) {
  const query = {
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getOne: vi.fn().mockResolvedValue(userRecord ? { ...userRecord, password_hash: passwordHash } : null),
  };
  const users = {
    createQueryBuilder: vi.fn(() => query),
    findOneBy: vi.fn().mockResolvedValue(userRecord),
  } as unknown as Repository<User>;
  const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') } as unknown as JwtService;

  return { service: new AuthService(users, jwt), jwt };
}

describe('AuthService', () => {
  it('firma un token de 7 días cuando se pide recordar el usuario', async () => {
    const hash = await bcrypt.hash(password, 4);
    const { service, jwt } = createService(user, hash);

    await service.login({ usuario: 'ana.perez', password, remember: true });

    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: user.rut, email: user.email, rol: user.rol },
      { expiresIn: '7d' },
    );
  });

  it('usa el vencimiento por defecto cuando no se pide recordar', async () => {
    const hash = await bcrypt.hash(password, 4);
    const { service, jwt } = createService(user, hash);

    await service.login({ usuario: 'ana.perez', password });

    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.rut, email: user.email, rol: user.rol });
  });

  it('rechaza credenciales inválidas', async () => {
    const hash = await bcrypt.hash(password, 4);
    const { service } = createService(user, hash);

    await expect(service.login({ usuario: 'ana.perez', password: 'otra-clave', remember: true }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('devuelve el usuario actual desde la base de datos', async () => {
    const { service } = createService(user, 'hash');

    await expect(service.me('12.345.678-9')).resolves.toEqual(user);
  });

  it('rechaza una sesión cuyo usuario ya no existe', async () => {
    const { service } = createService(null, 'hash');

    await expect(service.me('12.345.678-9')).rejects.toThrow(UnauthorizedException);
  });
});
