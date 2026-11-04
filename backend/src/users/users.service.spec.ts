import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

function createService(users: Partial<Repository<User>>) {
  return new UsersService(users as Repository<User>);
}

describe('UsersService', () => {
  it('deletes an existing user by RUT', async () => {
    const findOneBy = vi.fn().mockResolvedValue({ rut: '12.345.678-9' } as User);
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = createService({ findOneBy, delete: remove });

    await service.remove('12.345.678-9');

    expect(remove).toHaveBeenCalledWith({ rut: '12.345.678-9' });
  });

  it('rejects deleting a user that does not exist', async () => {
    const findOneBy = vi.fn().mockResolvedValue(null);
    const service = createService({ findOneBy });

    await expect(service.remove('12.345.678-9')).rejects.toThrow(NotFoundException);
  });
});
