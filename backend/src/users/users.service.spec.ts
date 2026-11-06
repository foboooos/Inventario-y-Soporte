import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Ticket } from '../tickets/ticket.entity.js';
import { User } from './user.entity.js';
import { UserRole } from './user-role.enum.js';
import { UsersService } from './users.service.js';

function createService(users: Partial<Repository<User>>, tickets: Partial<Repository<Ticket>> = {}) {
  return new UsersService(users as Repository<User>, tickets as Repository<Ticket>);
}

describe('UsersService', () => {
  it('deletes an existing user by RUT', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-9', rol: UserRole.DOCENTE } as User);
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = createService({ findOneBy, delete: remove }, { count: vi.fn().mockResolvedValue(0) });

    await service.remove('12.345.678-9', '99.999.999-9');

    expect(remove).toHaveBeenCalledWith({ rut: '12.345.678-9' });
  });

  it('normalizes the RUT before looking up and deleting', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-K', rol: UserRole.DOCENTE } as User);
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = createService({ findOneBy, delete: remove }, { count: vi.fn().mockResolvedValue(0) });

    await service.remove('12.345.678-0', '99.999.999-9');

    expect(findOneBy).toHaveBeenCalledWith({ rut: '12.345.678-K' });
    expect(remove).toHaveBeenCalledWith({ rut: '12.345.678-K' });
  });

  it('rejects deleting a user that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.remove('12.345.678-9', '99.999.999-9')).rejects.toThrow(NotFoundException);
  });

  it('rejects deleting the acting user', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-9', rol: UserRole.ADMIN } as User);
    const remove = vi.fn();
    const service = createService({ findOneBy, delete: remove });

    await expect(service.remove('12.345.678-9', '12.345.678-9')).rejects.toThrow('No puedes eliminar tu propio usuario');
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects deleting the last administrator', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-9', rol: UserRole.ADMIN } as User);
    const count = vi.fn().mockResolvedValue(1);
    const remove = vi.fn();
    const service = createService({ findOneBy, count, delete: remove });

    await expect(service.remove('12.345.678-9', '99.999.999-9')).rejects.toThrow('No puedes eliminar al último administrador');
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects deleting a user that has tickets', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-9', rol: UserRole.DOCENTE } as User);
    const remove = vi.fn();
    const service = createService(
      { findOneBy, delete: remove },
      { count: vi.fn().mockResolvedValue(2) },
    );

    await expect(service.remove('12.345.678-9', '99.999.999-9'))
      .rejects.toThrow(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('updates a user name, email and role', async () => {
    const user = {
      rut: '12.345.678-K',
      nombre: 'Ana',
      email: 'ana@colegio.cl',
      rol: UserRole.DOCENTE,
    } as User;
    const findOneBy = vi.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    const update = vi.fn().mockResolvedValue({ affected: 1 });
    const service = createService({ findOneBy, update });

    const result = await service.update('12.345.678-0', {
      nombre: 'Ana Pérez',
      email: 'ana.perez@colegio.cl',
      rol: UserRole.TECNICO,
    });

    expect(findOneBy).toHaveBeenNthCalledWith(1, { rut: '12.345.678-K' });
    expect(update).toHaveBeenCalledWith(
      { rut: '12.345.678-K' },
      { nombre: 'Ana Pérez', email: 'ana.perez@colegio.cl', rol: UserRole.TECNICO },
    );
    expect(result).toEqual({
      rut: '12.345.678-K',
      nombre: 'Ana Pérez',
      email: 'ana.perez@colegio.cl',
      rol: UserRole.TECNICO,
    });
  });

  it('rejects updating a user that does not exist', async () => {
    const service = createService({ findOneBy: vi.fn().mockResolvedValue(null) });

    await expect(service.update('12.345.678-9', { nombre: 'Ana' })).rejects.toThrow(NotFoundException);
  });

  it('rejects updating a user with an email already in use', async () => {
    const user = { rut: '12.345.678-9', nombre: 'Ana', email: 'ana@colegio.cl', rol: UserRole.DOCENTE } as User;
    const findOneBy = vi.fn()
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, rut: '98.765.432-1' } as User);
    const service = createService({ findOneBy });

    await expect(service.update('12.345.678-9', { email: 'otro@colegio.cl' }))
      .rejects.toThrow('Ya existe un usuario con ese email');
  });

  it('rejects removing the admin role from the last administrator', async () => {
    const user = { rut: '12.345.678-9', nombre: 'Admin', email: 'admin@colegio.cl', rol: UserRole.ADMIN } as User;
    const findOneBy = vi.fn().mockResolvedValue(user);
    const count = vi.fn().mockResolvedValue(1);
    const service = createService({ findOneBy, count });

    await expect(service.update('12.345.678-9', { rol: UserRole.DOCENTE }))
      .rejects.toThrow('No puedes quitar el rol al último administrador');
  });
});
