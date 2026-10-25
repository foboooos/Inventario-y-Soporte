import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { seedDevices } from './seeds/devices.seed.js';
import { seedLevels } from './seeds/levels.seed.js';
import { seedLocations } from './seeds/locations.seed.js';
import { seedSoftware } from './seeds/software.seed.js';
import { seedSubjects } from './seeds/subjects.seed.js';
import { seedTickets } from './seeds/tickets.seed.js';
import { seedUsers } from './seeds/users.seed.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);

  try {
    await seedLocations(dataSource);
    await seedLevels(dataSource);
    await seedSubjects(dataSource);
    await seedSoftware(dataSource);
    await seedUsers(dataSource);
    await seedDevices(dataSource);
    await seedTickets(dataSource);

    console.log('Seed completado');
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
