import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module.js';
import { User } from './users/user.entity.js';
import { UserRole } from './users/user-role.enum.js';

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function seedUser(repository: Repository<User>, userData: SeedUser) {
  const email = userData.email.trim().toLowerCase();
  const existingUser = await repository.findOneBy({ email });
  const user = existingUser ?? repository.create();

  user.nombre = userData.name;
  user.email = email;
  user.password_hash = await bcrypt.hash(userData.password, 12);
  user.rol = userData.role;

  await repository.save(user);
  console.log(`${existingUser ? 'Updated' : 'Created'} user ${email} (${userData.role})`);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);
  const users = dataSource.getRepository(User);

  const seedUsers: SeedUser[] = [
    {
      name: 'Miguel Administrador',
      email: requiredEnv('SEED_ADMIN_EMAIL'),
      password: requiredEnv('SEED_ADMIN_PASSWORD'),
      role: UserRole.ADMIN,
    },
    {
      name: 'Juan Castro',
      email: requiredEnv('SEED_TEACHER_EMAIL'),
      password: requiredEnv('SEED_TEACHER_PASSWORD'),
      role: UserRole.DOCENTE,
    },
  ];

  for (const user of seedUsers) {
    await seedUser(users, user);
  }

  await app.close();
}

bootstrap().catch(async (error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
