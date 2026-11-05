import dataSource from './data-source.js';
import { InitialSchema1793836800000 } from './migrations/InitialSchema1793836800000.js';

async function main() {
  const migrationClass = InitialSchema1793836800000;
  const migrationName = migrationClass.name;
  const timestamp = Number(migrationName.slice(-13));
  const table = dataSource.options.migrationsTableName ?? 'migrations';

  await dataSource.initialize();

  try {
    await dataSource.query(
      `CREATE TABLE IF NOT EXISTS "${table}" ("id" SERIAL NOT NULL, "timestamp" bigint NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id"))`,
    );
    await dataSource.query(
      `INSERT INTO "${table}" ("timestamp", "name") SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM "${table}" WHERE "name" = $2)`,
      [timestamp, migrationName],
    );
    console.log(`Baseline aplicado: ${migrationName}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
