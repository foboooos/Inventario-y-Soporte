import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { entities } from './entities.js';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const migrations = join(dirname(fileURLToPath(import.meta.url)), 'migrations/*.js');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'backend',
  entities,
  migrations: [migrations],
  migrationsTableName: 'migrations',
  synchronize: false,
});
