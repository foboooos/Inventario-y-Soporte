import { UnauthorizedException, ValidationPipe, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/auth/guards/roles.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { HealthController } from '../src/health/health.controller.js';
import { InventoryController } from '../src/inventory/inventory.controller.js';
import { DeviceType } from '../src/inventory/device-type.enum.js';
import { InventoryService } from '../src/inventory/inventory.service.js';
import { TicketController } from '../src/tickets/ticket.controller.js';
import { TicketService } from '../src/tickets/ticket.service.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { User } from '../src/users/user.entity.js';

const TEST_SECRET = 'backend-e2e-secret-with-at-least-32-characters';
const DOCENTE_LOGIN_ID = '22222222-2222-4222-8222-222222222222';
const testUsers = new Map([
  ['11.111.111-1', { rut: '11.111.111-1', email: 'admin@colegio.cl', rol: UserRole.ADMIN }],
  ['22.222.222-2', { rut: '22.222.222-2', email: 'docente@colegio.cl', rol: UserRole.DOCENTE }],
]);

describe('API (e2e, dependencias aisladas)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const authService = {
    login: vi.fn(async ({ usuario, password }: { usuario: string; password: string }) => {
      if (usuario !== DOCENTE_LOGIN_ID || password !== 'clave-valida') {
        throw new UnauthorizedException('Usuario o contraseña incorrectos');
      }
      return { access_token: 'token-de-prueba', user: { rut: '22.222.222-2' } };
    }),
    listLoginUsers: vi.fn().mockResolvedValue([{ id: 'docente', nombre: 'Docente Prueba' }]),
    me: vi.fn().mockResolvedValue({ rut: '22.222.222-2', nombre: 'Docente Prueba' }),
  };
  const inventoryService = {
    findOptions: vi.fn().mockResolvedValue({ tipos: [DeviceType.PC] }),
    nextCode: vi.fn().mockResolvedValue('PC-LC1-0001'),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    create: vi.fn(async (device: Record<string, unknown>) => ({ id_dispositivo: 1, ...device })),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const ticketService = {
    findInbox: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findBitacora: vi.fn(),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    resolve: vi.fn(),
    changeStatus: vi.fn(),
    create: vi.fn(async (ticket: Record<string, unknown>, rut: string) => ({ id_ticket: 1, ...ticket, id_solicitante: rut })),
  };
  const usersRepository = {
    findOneBy: vi.fn(({ rut }: { rut: string }) => Promise.resolve(testUsers.get(rut) ?? null)),
  };
  const dataSource = { query: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_SECRET }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
      ],
      controllers: [AuthController, HealthController, InventoryController, TicketController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: AuthService, useValue: authService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: TicketService, useValue: ticketService },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const tokenFor = (rut: string, rol: UserRole) => jwt.sign({ sub: rut, email: 'test@colegio.cl', rol });
  const as = (rut: string, rol: UserRole) => ({ Authorization: `Bearer ${tokenFor(rut, rol)}` });

  it('rechaza credenciales inválidas en el login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: '00000000-0000-4000-8000-000000000001', password: 'incorrecta' })
      .expect(401);
  });

  it('acepta credenciales válidas y devuelve el token', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: DOCENTE_LOGIN_ID, password: 'clave-valida' })
      .expect(201)
      .expect({ access_token: 'token-de-prueba', user: { rut: '22.222.222-2' } });
  });

  it('devuelve 401 para una ruta protegida sin token', async () => {
    await request(app.getHttpServer()).get('/inventory').expect(401);
  });

  it('devuelve 403 si un docente intenta consultar el inventario completo', async () => {
    await request(app.getHttpServer()).get('/inventory').set(as('22.222.222-2', UserRole.DOCENTE)).expect(403);
  });

  it('permite al técnico autorizado consultar el inventario', async () => {
    testUsers.set('33.333.333-3', { rut: '33.333.333-3', email: 'tecnico@colegio.cl', rol: UserRole.TECNICO });
    const token = tokenFor('33.333.333-3', UserRole.TECNICO);

    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ items: [], total: 0 });
  });

  it('permite al docente crear un ticket y asocia el solicitante autenticado', async () => {
    const ticket = { ubicacion: 'Laboratorio de Computación 1', sintoma: 'No enciende' };

    await request(app.getHttpServer())
      .post('/tickets')
      .set(as('22.222.222-2', UserRole.DOCENTE))
      .send(ticket)
      .expect(201)
      .expect({ id_ticket: 1, ...ticket, id_solicitante: '22.222.222-2' });

    expect(ticketService.create).toHaveBeenCalledWith(ticket, '22.222.222-2');
  });

  it('rechaza la creación de tickets para un administrador', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .set(as('11.111.111-1', UserRole.ADMIN))
      .send({ ubicacion: 'Sala PIE', sintoma: 'No enciende' })
      .expect(403);
  });

  it('valida el cuerpo del ticket antes de llamar al servicio', async () => {
    const callsBefore = ticketService.create.mock.calls.length;

    await request(app.getHttpServer())
      .post('/tickets')
      .set(as('22.222.222-2', UserRole.DOCENTE))
      .send({ ubicacion: '   ', sintoma: '' })
      .expect(400);

    expect(ticketService.create).toHaveBeenCalledTimes(callsBefore);
  });

  it('permite al administrador crear un dispositivo de inventario', async () => {
    const device = { tipo: DeviceType.PC, ubicacion: 'Lab. Computación 1', marca: 'HP', modelo: '255 G10' };

    await request(app.getHttpServer())
      .post('/inventory')
      .set(as('11.111.111-1', UserRole.ADMIN))
      .send(device)
      .expect(201)
      .expect({ id_dispositivo: 1, ...device });
  });

  it('expone el estado de salud sin conectar una base real', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
