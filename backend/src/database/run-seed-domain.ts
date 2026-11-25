import { isSeedDomain, runDomainSeeds } from '../seeds/run-domain.js';
import dataSource from './data-source.js';

async function main() {
  const domain = process.argv[2];

  if (!isSeedDomain(domain)) {
    throw new Error('Dominio inválido. Uso: node dist/database/run-seed-domain.js <catalogos|dispositivos>');
  }

  await dataSource.initialize();

  try {
    await runDomainSeeds(dataSource, domain);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
