import type { MigrationInterface, QueryRunner } from 'typeorm';

const upStatements = [
  `CREATE TYPE "public"."device_status" AS ENUM ('ACTIVO', 'INACTIVO', 'BAJA_TECNICA')`,
  `CREATE TYPE "public"."device_type" AS ENUM ('PC', 'PROYECTOR', 'IMPRESORA', 'RED')`,
  `CREATE TYPE "public"."software_licencia" AS ENUM ('LIBRE', 'GRATUITA', 'COMERCIAL', 'SUSCRIPCION', 'FREEMIUM')`,
  `CREATE TYPE "public"."ticket_status" AS ENUM ('ABIERTO', 'EN_PROCESO', 'RESUELTO')`,
  `CREATE TYPE "public"."user_role" AS ENUM ('ADMIN', 'TECNICO', 'DOCENTE')`,

  `CREATE TABLE "public"."asignatura_niveles" ("id_asignatura" integer NOT NULL, "id_nivel" integer NOT NULL)`,
  `CREATE TABLE "public"."asignaturas" ("id_asignatura" integer NOT NULL, "nombre" character varying(100) NOT NULL)`,
  `CREATE TABLE "public"."inventario" ("id_dispositivo" integer NOT NULL, "codigo_inventario" character varying(50) NOT NULL, "tipo" "public"."device_type" NOT NULL, "marca" character varying(50), "modelo" character varying(50), "ubicacion" character varying(100) NOT NULL, "estado" "public"."device_status" NOT NULL DEFAULT 'ACTIVO', "fecha_ingreso" date NOT NULL DEFAULT ('now'::text)::date)`,
  `CREATE TABLE "public"."niveles_educativos" ("id_nivel" integer NOT NULL, "nombre" character varying(100) NOT NULL)`,
  `CREATE TABLE "public"."secuencias_ticket" ("anio" integer NOT NULL, "ultimo_numero" integer NOT NULL DEFAULT 0)`,
  `CREATE TABLE "public"."software_asignaturas" ("id_software" integer NOT NULL, "id_asignatura" integer NOT NULL)`,
  `CREATE TABLE "public"."software_educativo" ("id_software" integer NOT NULL, "nombre" character varying(150) NOT NULL, "version" character varying(50) NOT NULL, "licencia" "public"."software_licencia" NOT NULL)`,
  `CREATE TABLE "public"."tickets_soporte" ("id_ticket" integer NOT NULL, "codigo_ticket" character varying(30) NOT NULL, "id_solicitante" character varying(12) NOT NULL, "id_dispositivo" integer, "ubicacion" character varying(100) NOT NULL, "sintoma" text NOT NULL, "causa_raiz" text, "solucion_aplicada" text, "estado" "public"."ticket_status" NOT NULL DEFAULT 'ABIERTO', "fecha_resolucion" timestamp without time zone, "tecnico_nombre" character varying(100), "estado_final" "public"."device_status", "fecha_creacion" timestamp without time zone NOT NULL DEFAULT now())`,
  `CREATE TABLE "public"."ubicaciones" ("id_ubicacion" integer NOT NULL, "nombre" character varying(100) NOT NULL, "sigla" character varying(3), "padre_id" integer, "tipo" character varying(20) NOT NULL DEFAULT 'PRINCIPAL')`,
  `CREATE TABLE "public"."usuarios" ("rut" character varying(12) NOT NULL, "nombre" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password_hash" character varying(255) NOT NULL, "rol" "public"."user_role" NOT NULL, "created_at" timestamp without time zone NOT NULL DEFAULT now())`,

  `CREATE SEQUENCE "public"."asignaturas_id_asignatura_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."asignaturas_id_asignatura_seq" OWNED BY "public"."asignaturas"."id_asignatura"`,
  `CREATE SEQUENCE "public"."inventario_id_dispositivo_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."inventario_id_dispositivo_seq" OWNED BY "public"."inventario"."id_dispositivo"`,
  `CREATE SEQUENCE "public"."niveles_educativos_id_nivel_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."niveles_educativos_id_nivel_seq" OWNED BY "public"."niveles_educativos"."id_nivel"`,
  `CREATE SEQUENCE "public"."software_educativo_id_software_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."software_educativo_id_software_seq" OWNED BY "public"."software_educativo"."id_software"`,
  `CREATE SEQUENCE "public"."tickets_soporte_id_ticket_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."tickets_soporte_id_ticket_seq" OWNED BY "public"."tickets_soporte"."id_ticket"`,
  `CREATE SEQUENCE "public"."ubicaciones_id_ubicacion_seq" AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
  `ALTER SEQUENCE "public"."ubicaciones_id_ubicacion_seq" OWNED BY "public"."ubicaciones"."id_ubicacion"`,

  `ALTER TABLE ONLY "public"."asignaturas" ALTER COLUMN "id_asignatura" SET DEFAULT nextval('public.asignaturas_id_asignatura_seq'::regclass)`,
  `ALTER TABLE ONLY "public"."inventario" ALTER COLUMN "id_dispositivo" SET DEFAULT nextval('public.inventario_id_dispositivo_seq'::regclass)`,
  `ALTER TABLE ONLY "public"."niveles_educativos" ALTER COLUMN "id_nivel" SET DEFAULT nextval('public.niveles_educativos_id_nivel_seq'::regclass)`,
  `ALTER TABLE ONLY "public"."software_educativo" ALTER COLUMN "id_software" SET DEFAULT nextval('public.software_educativo_id_software_seq'::regclass)`,
  `ALTER TABLE ONLY "public"."tickets_soporte" ALTER COLUMN "id_ticket" SET DEFAULT nextval('public.tickets_soporte_id_ticket_seq'::regclass)`,
  `ALTER TABLE ONLY "public"."ubicaciones" ALTER COLUMN "id_ubicacion" SET DEFAULT nextval('public.ubicaciones_id_ubicacion_seq'::regclass)`,

  `ALTER TABLE ONLY "public"."inventario" ADD CONSTRAINT "PK_0f6e8eafab68aacdaedc501daa6" PRIMARY KEY ("id_dispositivo")`,
  `ALTER TABLE ONLY "public"."asignaturas" ADD CONSTRAINT "PK_1a7da38caf516e188386a67d56f" PRIMARY KEY ("id_asignatura")`,
  `ALTER TABLE ONLY "public"."niveles_educativos" ADD CONSTRAINT "PK_599b7c806e235c7867f9d9cc4e9" PRIMARY KEY ("id_nivel")`,
  `ALTER TABLE ONLY "public"."ubicaciones" ADD CONSTRAINT "PK_7558c132be78bcf25714a754f40" PRIMARY KEY ("id_ubicacion")`,
  `ALTER TABLE ONLY "public"."software_educativo" ADD CONSTRAINT "PK_9b24286d61b4fe82fe9252d6f84" PRIMARY KEY ("id_software")`,
  `ALTER TABLE ONLY "public"."usuarios" ADD CONSTRAINT "PK_9e90b993976dcd8bdabf4e3159d" PRIMARY KEY ("rut")`,
  `ALTER TABLE ONLY "public"."secuencias_ticket" ADD CONSTRAINT "PK_d3a2a64771ecf79228af2a0f52f" PRIMARY KEY ("anio")`,
  `ALTER TABLE ONLY "public"."tickets_soporte" ADD CONSTRAINT "PK_e5dd2f82f1213b4ac0fb5f899de" PRIMARY KEY ("id_ticket")`,
  `ALTER TABLE ONLY "public"."software_asignaturas" ADD CONSTRAINT "PK_ebdb7ec372b1feabc6142ab7520" PRIMARY KEY ("id_software", "id_asignatura")`,
  `ALTER TABLE ONLY "public"."asignatura_niveles" ADD CONSTRAINT "PK_ec3b2448a9246648fe0bf2a93a2" PRIMARY KEY ("id_asignatura", "id_nivel")`,

  `ALTER TABLE ONLY "public"."inventario" ADD CONSTRAINT "UQ_00bb1002d47ce5ec7cd4f4a21d0" UNIQUE ("codigo_inventario")`,
  `ALTER TABLE ONLY "public"."niveles_educativos" ADD CONSTRAINT "UQ_0af6c139be8ef02251a60d80aa8" UNIQUE ("nombre")`,
  `ALTER TABLE ONLY "public"."ubicaciones" ADD CONSTRAINT "UQ_34c482d90ffa6c52213f1ab7805" UNIQUE ("sigla")`,
  `ALTER TABLE ONLY "public"."asignaturas" ADD CONSTRAINT "UQ_40cf936c181b28696d4027467bc" UNIQUE ("nombre")`,
  `ALTER TABLE ONLY "public"."usuarios" ADD CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email")`,
  `ALTER TABLE ONLY "public"."tickets_soporte" ADD CONSTRAINT "UQ_5b59312b2357ba1fe4947d1d676" UNIQUE ("codigo_ticket")`,
  `ALTER TABLE ONLY "public"."software_educativo" ADD CONSTRAINT "UQ_6f344ecf4372fa23a3c75cbecf1" UNIQUE ("nombre")`,
  `ALTER TABLE ONLY "public"."ubicaciones" ADD CONSTRAINT "UQ_ca7e6833016e978ce833796dc41" UNIQUE ("nombre")`,

  `CREATE INDEX "IDX_inventario_estado" ON "public"."inventario" USING btree ("estado")`,
  `CREATE INDEX "IDX_inventario_ubicacion" ON "public"."inventario" USING btree ("ubicacion")`,
  `CREATE INDEX "IDX_tickets_estado_estado_final_fecha" ON "public"."tickets_soporte" USING btree ("estado", "estado_final", "fecha_creacion")`,
  `CREATE INDEX "IDX_tickets_fecha_creacion" ON "public"."tickets_soporte" USING btree ("fecha_creacion")`,
  `CREATE INDEX "IDX_tickets_solicitante_fecha" ON "public"."tickets_soporte" USING btree ("id_solicitante", "fecha_creacion")`,
  `CREATE INDEX "IDX_tickets_ubicacion_fecha" ON "public"."tickets_soporte" USING btree ("ubicacion", "fecha_creacion")`,
];

const downStatements = [
  `DROP TABLE IF EXISTS "public"."asignatura_niveles" CASCADE`,
  `DROP TABLE IF EXISTS "public"."software_asignaturas" CASCADE`,
  `DROP TABLE IF EXISTS "public"."tickets_soporte" CASCADE`,
  `DROP TABLE IF EXISTS "public"."software_educativo" CASCADE`,
  `DROP TABLE IF EXISTS "public"."inventario" CASCADE`,
  `DROP TABLE IF EXISTS "public"."asignaturas" CASCADE`,
  `DROP TABLE IF EXISTS "public"."niveles_educativos" CASCADE`,
  `DROP TABLE IF EXISTS "public"."ubicaciones" CASCADE`,
  `DROP TABLE IF EXISTS "public"."usuarios" CASCADE`,
  `DROP TABLE IF EXISTS "public"."secuencias_ticket" CASCADE`,
  `DROP TYPE IF EXISTS "public"."device_status"`,
  `DROP TYPE IF EXISTS "public"."device_type"`,
  `DROP TYPE IF EXISTS "public"."software_licencia"`,
  `DROP TYPE IF EXISTS "public"."ticket_status"`,
  `DROP TYPE IF EXISTS "public"."user_role"`,
];

export class InitialSchema1793836800000 implements MigrationInterface {
  name = 'InitialSchema1793836800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of upStatements) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of downStatements) {
      await queryRunner.query(statement);
    }
  }
}
