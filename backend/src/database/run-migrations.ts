import dataSource from './data-source.js';

async function main() {
  await dataSource.initialize();

  try {
    const applied = await dataSource.runMigrations();
    console.log(`Migraciones aplicadas: ${applied.length}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
