import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketTechnician1794360000000 implements MigrationInterface {
  name = 'AddTicketTechnician1794360000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD COLUMN "id_tecnico" character varying(12)');
    await queryRunner.query(
      'ALTER TABLE "tickets_soporte" ADD CONSTRAINT "FK_tickets_tecnico" FOREIGN KEY ("id_tecnico") REFERENCES "usuarios"("rut") ON DELETE SET NULL',
    );
    await queryRunner.query('CREATE INDEX "IDX_tickets_tecnico" ON "tickets_soporte" ("id_tecnico")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_tickets_tecnico"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP CONSTRAINT "FK_tickets_tecnico"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP COLUMN "id_tecnico"');
  }
}
