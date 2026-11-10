import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEncryptedBirthDate1794244713692 implements MigrationInterface {
  name = 'AddEncryptedBirthDate1794244713692';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "usuarios" ADD COLUMN "fecha_nacimiento_cifrada" character varying(255)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuarios" DROP COLUMN "fecha_nacimiento_cifrada"');
  }
}
