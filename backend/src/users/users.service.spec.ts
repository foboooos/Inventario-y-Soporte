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
});
