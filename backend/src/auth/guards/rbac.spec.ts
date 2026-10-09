import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InventoryController } from '../../inventory/inventory.controller.js';
import { InventoryService } from '../../inventory/inventory.service.js';
import { TicketController } from '../../tickets/ticket.controller.js';
import { TicketService } from '../../tickets/ticket.service.js';
import { UserRole } from '../../users/user-role.enum.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ROLES_KEY } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

const TEST_SECRET = 'rbac-test-secret';
const GUARDS_METADATA = '__guards__';
const METHOD_METADATA = 'method';

const PUBLIC_CONTROLLERS = new Set(['AppController', 'AuthController']);

const controllerModules = import.meta.glob<Record<string, unknown>>('../../**/*.controller.ts', {
  eager: true,
});

const routeHandlers = (controller: any): string[] =>
  Object.getOwnPropertyNames(controller.prototype).filter(
    (method) =>
      method !== 'constructor' &&
      Reflect.getMetadata(METHOD_METADATA, controller.prototype[method]) !== undefined,
  );

const isController = (value: unknown): value is any =>
  typeof value === 'function' && routeHandlers(value).length > 0;

const controllers: Array<[string, any]> = Object.values(controllerModules)
  .flatMap(
    (module) => Object.entries(module).filter(([, value]) => isController(value)) as Array<[string, any]>,
  )
  .sort(([a], [b]) => a.localeCompare(b));

const rolesOf = (controller: any, method: string): UserRole[] | undefined =>
  Reflect.getMetadata(ROLES_KEY, controller.prototype[method]);

const docenteForbiddenRoutes: Array<[string, any, string]> = [
  ['InventoryController.findAll', InventoryController, 'findAll'],
  ['InventoryController.create', InventoryController, 'create'],
  ['InventoryController.update', InventoryController, 'update'],
  ['TicketController.findInbox', TicketController, 'findInbox'],
  ['TicketController.findBitacora', TicketController, 'findBitacora'],
  ['TicketController.resolve', TicketController, 'resolve'],
  ['TicketController.changeStatus', TicketController, 'changeStatus'],
];

describe('RBAC audit — control de acceso aplicado en el backend', () => {
  it('descubre automáticamente todos los controladores de la aplicación', () => {
    expect(controllers.map(([name]) => name)).toEqual([
      'AppController',
      'AuthController',
      'InventoryController',
      'LevelController',
      'LocationController',
      'SoftwareController',
      'SubjectController',
      'TicketController',
    ]);
  });

  it.each(controllers)('%s está protegido por JwtAuthGuard y RolesGuard', (name, controller) => {
    if (PUBLIC_CONTROLLERS.has(name)) {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toBeUndefined();
      return;
    }

    const guards = (Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ?? [];

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it.each(controllers)('%s declara @Roles en cada handler de ruta', (name, controller) => {
    for (const route of routeHandlers(controller)) {
      const roles = rolesOf(controller, route);

      if (PUBLIC_CONTROLLERS.has(name)) {
        expect(roles, `${name}.${route} no debe declarar @Roles`).toBeUndefined();
        continue;
      }

      expect(roles, `${name}.${route} sin @Roles`).toBeInstanceOf(Array);
      expect(roles!.length, `${name}.${route} sin @Roles`).toBeGreaterThan(0);
    }
  });

  it.each(docenteForbiddenRoutes)('%s excluye el rol DOCENTE', (_label, controller, method) => {
    expect(rolesOf(controller, method)).not.toContain(UserRole.DOCENTE);
  });
});

describe('RBAC enforcement — DOCENTE bloqueado con 403 en inventario y bitácora', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const inventoryService = {
    findOptions: () => [],
    findAll: () => ({ data: [], total: 0 }),
    create: () => ({}),
    update: () => ({}),
  };
  const ticketService = {
    findInbox: () => [],
    findBitacora: () => ({}),
    findAll: () => [],
  };

  const payload = (rol: string) => ({ sub: '12345678-9', email: 'usuario@colegio.cl', rol });
  const token = (rol: UserRole) => jwt.sign(payload(rol));
  const docente = () => token(UserRole.DOCENTE);
  const tecnico = () => token(UserRole.TECNICO);
  const admin = () => token(UserRole.ADMIN);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_SECRET })],
      controllers: [InventoryController, TicketController],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: TicketService, useValue: ticketService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 401 sin token', async () => {
    await request(app.getHttpServer()).get('/inventory').expect(401);
  });

  it('devuelve 401 con un token inválido', async () => {
    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('devuelve 401 con un token firmado con otro secreto', async () => {
    const forged = jwt.sign(payload(UserRole.ADMIN), { secret: 'secreto-atacante' });

    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('devuelve 403 cuando el token trae un rol desconocido', async () => {
    const forged = jwt.sign(payload('ROOT'));

    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${forged}`)
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE lista el inventario', async () => {
    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${docente()}`)
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE crea un dispositivo', async () => {
    await request(app.getHttpServer())
      .post('/inventory')
      .set('Authorization', `Bearer ${docente()}`)
      .send({})
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE edita un dispositivo', async () => {
    await request(app.getHttpServer())
      .patch('/inventory/1')
      .set('Authorization', `Bearer ${docente()}`)
      .send({})
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE accede a la bandeja técnica', async () => {
    await request(app.getHttpServer())
      .get('/tickets/inbox')
      .set('Authorization', `Bearer ${docente()}`)
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE solicita una bitácora', async () => {
    await request(app.getHttpServer())
      .get('/tickets/1/bitacora')
      .set('Authorization', `Bearer ${docente()}`)
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE resuelve un ticket', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/1')
      .set('Authorization', `Bearer ${docente()}`)
      .send({})
      .expect(403);
  });

  it('devuelve 403 cuando un DOCENTE cambia el estado de un ticket', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/1/status')
      .set('Authorization', `Bearer ${docente()}`)
      .send({ estado: 'EN_PROCESO' })
      .expect(403);
  });

  it('devuelve 403 cuando un TECNICO lista sus propios tickets (ruta solo DOCENTE)', async () => {
    await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${tecnico()}`)
      .expect(403);
  });

  it('permite a un DOCENTE leer las opciones de inventario para crear tickets', async () => {
    await request(app.getHttpServer())
      .get('/inventory/options')
      .set('Authorization', `Bearer ${docente()}`)
      .expect(200);
  });

  it('permite a un DOCENTE listar sus propios tickets', async () => {
    await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${docente()}`)
      .expect(200);
  });

  it('permite a un TECNICO listar el inventario', async () => {
    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${tecnico()}`)
      .expect(200);
  });

  it('permite a un TECNICO leer la bitácora', async () => {
    await request(app.getHttpServer())
      .get('/tickets/1/bitacora')
      .set('Authorization', `Bearer ${tecnico()}`)
      .expect(200);
  });

  it('permite a un ADMIN listar el inventario', async () => {
    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${admin()}`)
      .expect(200);
  });

  it('permite a un ADMIN leer la bitácora', async () => {
    await request(app.getHttpServer())
      .get('/tickets/1/bitacora')
      .set('Authorization', `Bearer ${admin()}`)
      .expect(200);
  });
});
