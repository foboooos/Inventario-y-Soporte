import dataSource from './data-source.js';
import { bootstrapAdmin } from './bootstrap-admin.js';

async function main() {
  const password = process.env.SYS_ADMIN_PASSWORD;
  const nombre = process.env.SYS_ADMIN_NOMBRE;

  if (!password) {
    throw new Error('SYS_ADMIN_PASSWORD debe estar definida');
  }

  if (!nombre) {
    throw new Error('SYS_ADMIN_NOMBRE debe estar definida');
  }

  await dataSource.initialize();

  try {
    await bootstrapAdmin(dataSource, {
      rut: process.env.SYS_ADMIN_RUT ?? '12.345.678-9',
      nombre,
      email: process.env.SYS_ADMIN_EMAIL ?? 'miguel.ramirez@davincicoquimbo.cl',
      password,
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
