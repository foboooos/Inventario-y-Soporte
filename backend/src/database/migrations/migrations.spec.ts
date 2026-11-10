import type { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { InitialSchema1793836800000 } from './InitialSchema1793836800000.js';
import { AddTicketForeignKeys1794206787051 } from './AddTicketForeignKeys1794206787051.js';
import { AddLoginIdentityAndBirthDate1794242248001 } from './AddLoginIdentityAndBirthDate1794242248001.js';
import { AddEncryptedBirthDate1794244713692 } from './AddEncryptedBirthDate1794244713692.js';

const queryRunnerWith = (query: ReturnType<typeof vi.fn>) => ({ query }) as unknown as QueryRunner;

describe('migraciones del esquema', () => {
  it('crea y revierte las tablas base', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const migration = new InitialSchema1793836800000();

    await migration.up(queryRunnerWith(query));

    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE "public"."usuarios"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE "public"."tickets_soporte"'));

    query.mockClear();
    await migration.down(queryRunnerWith(query));

    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE IF EXISTS "public"."usuarios"'));
  });

  it('rechaza agregar las claves foráneas si hay tickets con solicitantes inexistentes', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const migration = new AddTicketForeignKeys1794206787051();

    await expect(migration.up(queryRunnerWith(query)))
      .rejects.toThrow('hay 1 ticket(s) con solicitante inexistente');

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rechaza agregar la clave de dispositivo si hay tickets con dispositivos inexistentes', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 2 }]);
    const migration = new AddTicketForeignKeys1794206787051();

    await expect(migration.up(queryRunnerWith(query)))
      .rejects.toThrow('hay 2 ticket(s) con dispositivo inexistente');

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('agrega y revierte las claves foráneas de tickets y dispositivos', async () => {
    const query = vi.fn().mockResolvedValue([{ count: 0 }]);
    const queryRunner = queryRunnerWith(query);
    const migration = new AddTicketForeignKeys1794206787051();

    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_tickets_solicitante"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_tickets_dispositivo"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON DELETE RESTRICT'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON DELETE SET NULL'));

    query.mockClear();
    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP CONSTRAINT "FK_tickets_dispositivo"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP CONSTRAINT "FK_tickets_solicitante"'));
  });

  it('agrega y revierte la identidad de login y el hash de nacimiento', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const queryRunner = queryRunnerWith(query);
    const migration = new AddLoginIdentityAndBirthDate1794242248001();

    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN "login_id" uuid'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN "fecha_nacimiento_hash"'));

    query.mockClear();
    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP COLUMN "login_id"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP COLUMN "fecha_nacimiento_hash"'));
  });

  it('agrega y revierte la fecha de nacimiento cifrada', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const queryRunner = queryRunnerWith(query);
    const migration = new AddEncryptedBirthDate1794244713692();

    await migration.up(queryRunner);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN "fecha_nacimiento_cifrada"'));

    query.mockClear();
    await migration.down(queryRunner);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP COLUMN "fecha_nacimiento_cifrada"'));
  });
});
