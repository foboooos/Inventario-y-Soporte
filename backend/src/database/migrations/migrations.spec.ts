import type { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { InitialSchema1793836800000 } from './InitialSchema1793836800000.js';
import { AddTicketForeignKeys1794206787051 } from './AddTicketForeignKeys1794206787051.js';
import { AddLoginIdentityAndBirthDate1794242248001 } from './AddLoginIdentityAndBirthDate1794242248001.js';
import { AddEncryptedBirthDate1794244713692 } from './AddEncryptedBirthDate1794244713692.js';
import { AddTicketTechnician1794360000000 } from './AddTicketTechnician1794360000000.js';
import { RelateDomainTables1794352000000 } from './RelateDomainTables1794352000000.js';

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

  it('normaliza las referencias a ubicaciones y conecta las tablas puente', async () => {
    const query = vi.fn().mockResolvedValue([{ count: 0 }]);
    const queryRunner = queryRunnerWith(query);
    const migration = new RelateDomainTables1794352000000();

    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "inventario" d SET "id_ubicacion"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "tickets_soporte" t SET "id_ubicacion"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_inventario_ubicacion"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_tickets_ubicacion"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_tickets_secuencia"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD CONSTRAINT "FK_ubicaciones_padre"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FK_asignatura_niveles_asignatura'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FK_software_asignaturas_software'));
  });

  it('relaciona al técnico que resuelve el ticket y conserva el snapshot al eliminarlo', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const queryRunner = queryRunnerWith(query);
    const migration = new AddTicketTechnician1794360000000();

    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN "id_tecnico"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FK_tickets_tecnico'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON DELETE SET NULL'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX "IDX_tickets_tecnico"'));

    query.mockClear();
    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP CONSTRAINT "FK_tickets_tecnico"'));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DROP COLUMN "id_tecnico"'));
  });

  it('detiene la normalización si encuentra registros sin ubicación asociada', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: 2 }]);
    const migration = new RelateDomainTables1794352000000();

    await expect(migration.up(queryRunnerWith(query))).rejects.toThrow('hay ubicaciones inexistentes: 2 registro(s)');
    expect(query).toHaveBeenCalledOnce();
  });
});
