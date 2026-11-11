import type { MigrationInterface, QueryRunner } from 'typeorm';

type CountRow = { count: number };

async function assertNoOrphans(queryRunner: QueryRunner, query: string, message: string): Promise<void> {
  const rows = await queryRunner.query(query) as CountRow[];
  const count = Number(rows[0]?.count ?? 0);

  if (count > 0) {
    throw new Error(message + ': ' + count + ' registro(s)');
  }
}

export class RelateDomainTables1794352000000 implements MigrationInterface {
  name = 'RelateDomainTables1794352000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "inventario" d LEFT JOIN "ubicaciones" u ON u."nombre" = d."ubicacion" WHERE u."id_ubicacion" IS NULL', 'No se pueden relacionar los dispositivos: hay ubicaciones inexistentes');
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "tickets_soporte" t LEFT JOIN "ubicaciones" u ON u."nombre" = t."ubicacion" WHERE u."id_ubicacion" IS NULL', 'No se pueden relacionar los tickets: hay ubicaciones inexistentes');
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "ubicaciones" c LEFT JOIN "ubicaciones" p ON p."id_ubicacion" = c."padre_id" WHERE c."padre_id" IS NOT NULL AND p."id_ubicacion" IS NULL', 'No se puede relacionar la jerarquía de ubicaciones: hay padres inexistentes');
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "asignatura_niveles" l LEFT JOIN "asignaturas" a ON a."id_asignatura" = l."id_asignatura" LEFT JOIN "niveles_educativos" n ON n."id_nivel" = l."id_nivel" WHERE a."id_asignatura" IS NULL OR n."id_nivel" IS NULL', 'No se pueden relacionar asignaturas y niveles: hay referencias inexistentes');
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "software_asignaturas" l LEFT JOIN "software_educativo" s ON s."id_software" = l."id_software" LEFT JOIN "asignaturas" a ON a."id_asignatura" = l."id_asignatura" WHERE s."id_software" IS NULL OR a."id_asignatura" IS NULL', 'No se pueden relacionar software y asignaturas: hay referencias inexistentes');
    await assertNoOrphans(queryRunner, 'SELECT COUNT(*)::int AS count FROM "tickets_soporte" WHERE "codigo_ticket" !~ \'^TCK-[0-9]{4}-[0-9]+$\'', 'No se puede relacionar la secuencia anual: hay códigos de ticket con formato inesperado');

    await queryRunner.query('ALTER TABLE "inventario" ADD COLUMN "id_ubicacion" integer');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD COLUMN "id_ubicacion" integer');
    await queryRunner.query('UPDATE "inventario" d SET "id_ubicacion" = u."id_ubicacion" FROM "ubicaciones" u WHERE u."nombre" = d."ubicacion"');
    await queryRunner.query('UPDATE "tickets_soporte" t SET "id_ubicacion" = u."id_ubicacion" FROM "ubicaciones" u WHERE u."nombre" = t."ubicacion"');

    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD COLUMN "anio_ticket" integer');
    await queryRunner.query('UPDATE "tickets_soporte" SET "anio_ticket" = substring("codigo_ticket" FROM \'^TCK-([0-9]{4})-\')::integer');
    await queryRunner.query('INSERT INTO "secuencias_ticket" ("anio", "ultimo_numero") SELECT "anio_ticket", MAX(substring("codigo_ticket" FROM \'-([0-9]+)$\')::integer) FROM "tickets_soporte" GROUP BY "anio_ticket" ON CONFLICT ("anio") DO UPDATE SET "ultimo_numero" = GREATEST("secuencias_ticket"."ultimo_numero", EXCLUDED."ultimo_numero")');

    await queryRunner.query('ALTER TABLE "inventario" ALTER COLUMN "id_ubicacion" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ALTER COLUMN "id_ubicacion" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ALTER COLUMN "anio_ticket" SET NOT NULL');

    await queryRunner.query('DROP INDEX "IDX_inventario_ubicacion"');
    await queryRunner.query('DROP INDEX "IDX_tickets_ubicacion_fecha"');
    await queryRunner.query('ALTER TABLE "inventario" DROP COLUMN "ubicacion"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP COLUMN "ubicacion"');
    await queryRunner.query('CREATE INDEX "IDX_inventario_ubicacion" ON "inventario" ("id_ubicacion")');
    await queryRunner.query('CREATE INDEX "IDX_tickets_ubicacion_fecha" ON "tickets_soporte" ("id_ubicacion", "fecha_creacion")');

    await queryRunner.query('ALTER TABLE "ubicaciones" ADD CONSTRAINT "FK_ubicaciones_padre" FOREIGN KEY ("padre_id") REFERENCES "ubicaciones"("id_ubicacion") ON DELETE RESTRICT');
    await queryRunner.query('ALTER TABLE "inventario" ADD CONSTRAINT "FK_inventario_ubicacion" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicaciones"("id_ubicacion") ON DELETE RESTRICT');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD CONSTRAINT "FK_tickets_ubicacion" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicaciones"("id_ubicacion") ON DELETE RESTRICT');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD CONSTRAINT "FK_tickets_secuencia" FOREIGN KEY ("anio_ticket") REFERENCES "secuencias_ticket"("anio") ON DELETE RESTRICT');
    await queryRunner.query('ALTER TABLE "asignatura_niveles" ADD CONSTRAINT "FK_asignatura_niveles_asignatura" FOREIGN KEY ("id_asignatura") REFERENCES "asignaturas"("id_asignatura") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "asignatura_niveles" ADD CONSTRAINT "FK_asignatura_niveles_nivel" FOREIGN KEY ("id_nivel") REFERENCES "niveles_educativos"("id_nivel") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "software_asignaturas" ADD CONSTRAINT "FK_software_asignaturas_software" FOREIGN KEY ("id_software") REFERENCES "software_educativo"("id_software") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "software_asignaturas" ADD CONSTRAINT "FK_software_asignaturas_asignatura" FOREIGN KEY ("id_asignatura") REFERENCES "asignaturas"("id_asignatura") ON DELETE CASCADE');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "software_asignaturas" DROP CONSTRAINT "FK_software_asignaturas_asignatura"');
    await queryRunner.query('ALTER TABLE "software_asignaturas" DROP CONSTRAINT "FK_software_asignaturas_software"');
    await queryRunner.query('ALTER TABLE "asignatura_niveles" DROP CONSTRAINT "FK_asignatura_niveles_nivel"');
    await queryRunner.query('ALTER TABLE "asignatura_niveles" DROP CONSTRAINT "FK_asignatura_niveles_asignatura"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP CONSTRAINT "FK_tickets_secuencia"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP CONSTRAINT "FK_tickets_ubicacion"');
    await queryRunner.query('ALTER TABLE "inventario" DROP CONSTRAINT "FK_inventario_ubicacion"');
    await queryRunner.query('ALTER TABLE "ubicaciones" DROP CONSTRAINT "FK_ubicaciones_padre"');

    await queryRunner.query('ALTER TABLE "inventario" ADD COLUMN "ubicacion" character varying(100)');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ADD COLUMN "ubicacion" character varying(100)');
    await queryRunner.query('UPDATE "inventario" d SET "ubicacion" = u."nombre" FROM "ubicaciones" u WHERE u."id_ubicacion" = d."id_ubicacion"');
    await queryRunner.query('UPDATE "tickets_soporte" t SET "ubicacion" = u."nombre" FROM "ubicaciones" u WHERE u."id_ubicacion" = t."id_ubicacion"');
    await queryRunner.query('ALTER TABLE "inventario" ALTER COLUMN "ubicacion" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tickets_soporte" ALTER COLUMN "ubicacion" SET NOT NULL');

    await queryRunner.query('DROP INDEX "IDX_inventario_ubicacion"');
    await queryRunner.query('DROP INDEX "IDX_tickets_ubicacion_fecha"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP COLUMN "anio_ticket"');
    await queryRunner.query('ALTER TABLE "inventario" DROP COLUMN "id_ubicacion"');
    await queryRunner.query('ALTER TABLE "tickets_soporte" DROP COLUMN "id_ubicacion"');
    await queryRunner.query('CREATE INDEX "IDX_inventario_ubicacion" ON "inventario" ("ubicacion")');
    await queryRunner.query('CREATE INDEX "IDX_tickets_ubicacion_fecha" ON "tickets_soporte" ("ubicacion", "fecha_creacion")');
  }
}
