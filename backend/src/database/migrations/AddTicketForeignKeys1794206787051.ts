import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketForeignKeys1794206787051 implements MigrationInterface {
  name = 'AddTicketForeignKeys1794206787051';

  async up(queryRunner: QueryRunner): Promise<void> {
    const orphanedRequesters = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM "tickets_soporte" ticket
       LEFT JOIN "usuarios" requester ON requester."rut" = ticket."id_solicitante"
       WHERE requester."rut" IS NULL`,
    ) as Array<{ count: number }>;

    if (orphanedRequesters[0]?.count > 0) {
      throw new Error(
        `No se pueden crear las claves foráneas: hay ${orphanedRequesters[0].count} ticket(s) con solicitante inexistente`,
      );
    }

    const orphanedDevices = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM "tickets_soporte" ticket
       LEFT JOIN "inventario" device ON device."id_dispositivo" = ticket."id_dispositivo"
       WHERE ticket."id_dispositivo" IS NOT NULL AND device."id_dispositivo" IS NULL`,
    ) as Array<{ count: number }>;

    if (orphanedDevices[0]?.count > 0) {
      throw new Error(
        `No se pueden crear las claves foráneas: hay ${orphanedDevices[0].count} ticket(s) con dispositivo inexistente`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "tickets_soporte"
       ADD CONSTRAINT "FK_tickets_solicitante"
       FOREIGN KEY ("id_solicitante") REFERENCES "usuarios"("rut") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets_soporte"
       ADD CONSTRAINT "FK_tickets_dispositivo"
       FOREIGN KEY ("id_dispositivo") REFERENCES "inventario"("id_dispositivo") ON DELETE SET NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP CONSTRAINT "FK_tickets_dispositivo"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP CONSTRAINT "FK_tickets_solicitante"');
  }
}
