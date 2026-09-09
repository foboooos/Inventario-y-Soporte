import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module.js';
import { User } from './users/user.entity.js';
import { UserRole } from './users/user-role.enum.js';
import { Device } from './inventory/device.entity.js';
import { DeviceStatus } from './inventory/device-status.enum.js';
import { DeviceType } from './inventory/device-type.enum.js';

type SeedUser = {
  rut: string;
  name: string;
  email: string;
  role: UserRole;
};

type SeedDevice = {
  code: string;
  type: DeviceType;
  brand: string;
  model: string;
  location: string;
  status: DeviceStatus;
};

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function passwordFromRut(rut: string): string {
  return rut.replace(/\./g, '');
}

async function seedDevice(repository: Repository<Device>, deviceData: SeedDevice) {
  const code = deviceData.code.trim();
  const existingDevice = await repository.findOneBy({ codigo_inventario: code });
  const device = existingDevice ?? repository.create();

  device.codigo_inventario = code;
  device.tipo = deviceData.type;
  device.marca = deviceData.brand;
  device.modelo = deviceData.model;
  device.ubicacion = deviceData.location;
  device.estado = deviceData.status;

  await repository.save(device);
  console.log(`${existingDevice ? 'Updated' : 'Created'} device ${code}`);
}

async function seedUser(repository: Repository<User>, userData: SeedUser) {
  const rut = userData.rut.trim();
  const email = userData.email.trim().toLowerCase();
  const existingUser = await repository.findOneBy({ rut });
  const user = existingUser ?? repository.create();

  user.rut = rut;
  user.nombre = userData.name.trim();
  user.email = email;
  user.password_hash = await bcrypt.hash(passwordFromRut(rut), 12);
  user.rol = userData.role;

  await repository.save(user);
  console.log(`${existingUser ? 'Updated' : 'Created'} user ${email} (${userData.role})`);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);
  const users = dataSource.getRepository(User);
  const devices = dataSource.getRepository(Device);

  const seedDevices: SeedDevice[] = [
    { code: 'DV-PC-001', type: DeviceType.PC, brand: 'Dell', model: 'OptiPlex 7010', location: 'Laboratorio 1', status: DeviceStatus.ACTIVO },
    { code: 'DV-PC-002', type: DeviceType.PC, brand: 'Lenovo', model: 'ThinkCentre M70q', location: 'Sala de profesores', status: DeviceStatus.ACTIVO },
    { code: 'DV-PRO-001', type: DeviceType.PROYECTOR, brand: 'Epson', model: 'PowerLite X49', location: 'Sala de clases', status: DeviceStatus.ACTIVO },
    { code: 'DV-IMP-001', type: DeviceType.IMPRESORA, brand: 'HP', model: 'LaserJet Pro M404', location: 'Administración', status: DeviceStatus.INACTIVO },
    { code: 'DV-RED-001', type: DeviceType.RED, brand: 'Ubiquiti', model: 'UniFi AP AC Pro', location: 'Pasillo segundo piso', status: DeviceStatus.ACTIVO },
    { code: 'DV-PC-003', type: DeviceType.PC, brand: 'Acer', model: 'Veriton X', location: 'Laboratorio 2', status: DeviceStatus.BAJA_TECNICA },
  ];

  for (const device of seedDevices) {
    await seedDevice(devices, device);
  }

  const seedUsers: SeedUser[] = [
    {
      rut: requiredEnv('SEED_ADMIN_RUT'),
      name: requiredEnv('SEED_ADMIN_NAME'),
      email: requiredEnv('SEED_ADMIN_EMAIL'),
      role: UserRole.ADMIN,
    },
    {
      rut: requiredEnv('SEED_TEACHER_RUT'),
      name: requiredEnv('SEED_TEACHER_NAME'),
      email: requiredEnv('SEED_TEACHER_EMAIL'),
      role: UserRole.DOCENTE,
    },
  ];

  for (const user of seedUsers) {
    await seedUser(users, user);
  }

  await app.close();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
