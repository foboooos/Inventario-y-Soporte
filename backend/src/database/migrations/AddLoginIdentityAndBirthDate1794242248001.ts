import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginIdentityAndBirthDate1794242248001 implements MigrationInterface {
  name = 'AddLoginIdentityAndBirthDate1794242248001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios"
       ADD COLUMN "login_id" uuid NOT NULL DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios"
       ADD CONSTRAINT "UQ_usuarios_login_id" UNIQUE ("login_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios"
       ADD COLUMN "fecha_nacimiento_hash" character varying(60)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuarios" DROP COLUMN "fecha_nacimiento_hash"');
    await queryRunner.query('ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_usuarios_login_id"');
    await queryRunner.query('ALTER TABLE "usuarios" DROP COLUMN "login_id"');
  }
}
