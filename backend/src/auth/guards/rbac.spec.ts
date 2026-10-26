import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LevelController } from '../../academics/level.controller.js';
import { LevelService } from '../../academics/level.service.js';
import { SubjectController } from '../../academics/subject.controller.js';
import { SubjectService } from '../../academics/subject.service.js';
import { InventoryController } from '../../inventory/inventory.controller.js';
import { InventoryService } from '../../inventory/inventory.service.js';
import { LocationController } from '../../locations/location.controller.js';
import { LocationService } from '../../locations/location.service.js';
import { SoftwareController } from '../../software/software.controller.js';
import { SoftwareService } from '../../software/software.service.js';
import { TicketController } from '../../tickets/ticket.controller.js';
import { TicketService } from '../../tickets/ticket.service.js';
import { UserRole } from '../../users/user-role.enum.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ROLES_KEY } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

const TEST_SECRET = 'rbac-test-secret';
const GUARDS_METADATA = '__guards__';
const METHOD_METADATA = 'method';

const PUBLIC_CONTROLLERS = new Set(['AuthController']);

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

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';
type RouteCase = {
  controller: any;
  handler: string;
  method: HttpMethod;
  path: string;
  status: number;
};

const protectedRoutes: RouteCase[] = [
  { controller: InventoryController, handler: 'findOptions', method: 'get', path: '/inventory/options', status: 200 },
  { controller: InventoryController, handler: 'findAll', method: 'get', path: '/inventory', status: 200 },
  { controller: InventoryController, handler: 'create', method: 'post', path: '/inventory', status: 201 },
  { controller: InventoryController, handler: 'update', method: 'patch', path: '/inventory/1', status: 200 },
  { controller: TicketController, handler: 'findInbox', method: 'get', path: '/tickets/inbox', status: 200 },
  { controller: TicketController, handler: 'findBitacora', method: 'get', path: '/tickets/1/bitacora', status: 200 },
  { controller: TicketController, handler: 'findAll', method: 'get', path: '/tickets', status: 200 },
  { controller: TicketController, handler: 'resolve', method: 'patch', path: '/tickets/1', status: 200 },
  { controller: TicketController, handler: 'changeStatus', method: 'patch', path: '/tickets/1/status', status: 200 },
  { controller: TicketController, handler: 'create', method: 'post', path: '/tickets', status: 201 },
  { controller: LocationController, handler: 'findAll', method: 'get', path: '/locations', status: 200 },
  { controller: LocationController, handler: 'create', method: 'post', path: '/locations', status: 201 },
  { controller: LocationController, handler: 'generateCourses', method: 'post', path: '/locations/courses', status: 201 },
  { controller: LocationController, handler: 'rename', method: 'patch', path: '/locations/1', status: 200 },
  { controller: LocationController, handler: 'remove', method: 'delete', path: '/locations/1', status: 204 },
  { controller: LevelController, handler: 'findAll', method: 'get', path: '/levels', status: 200 },
  { controller: LevelController, handler: 'create', method: 'post', path: '/levels', status: 201 },
  { controller: LevelController, handler: 'rename', method: 'patch', path: '/levels/1', status: 200 },
  { controller: LevelController, handler: 'remove', method: 'delete', path: '/levels/1', status: 204 },
  { controller: SubjectController, handler: 'findAll', method: 'get', path: '/subjects', status: 200 },
  { controller: SubjectController, handler: 'create', method: 'post', path: '/subjects', status: 201 },
  { controller: SubjectController, handler: 'update', method: 'patch', path: '/subjects/1', status: 200 },
  { controller: SubjectController, handler: 'remove', method: 'delete', path: '/subjects/1', status: 204 },
  { controller: SoftwareController, handler: 'findAll', method: 'get', path: '/software', status: 200 },
  { controller: SoftwareController, handler: 'create', method: 'post', path: '/software', status: 201 },
  { controller: SoftwareController, handler: 'update', method: 'patch', path: '/software/1', status: 200 },
  { controller: SoftwareController, handler: 'remove', method: 'delete', path: '/software/1', status: 204 },
];

const forbiddenRoleRoutes = protectedRoutes.flatMap((route) => {
  const allowedRoles = rolesOf(route.controller, route.handler) ?? [];
  return Object.values(UserRole)
    .filter((role) => !allowedRoles.includes(role))
    .map((role) => ({ route, role }));
});

const serviceMock = (methods: string[]) => Object.fromEntries(
  methods.map((method) => [method, vi.fn().mockReturnValue({})]),
);

describe('RBAC audit — control de acceso aplicado en el backend', () => {
  it('descubre automáticamente todos los controladores de la aplicación', () => {
    expect(controllers.map(([name]) => name)).toEqual([
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

  it('tiene un caso HTTP para cada ruta protegida', () => {
    const expected = controllers
      .filter(([name]) => !PUBLIC_CONTROLLERS.has(name))
      .flatMap(([name, controller]) => routeHandlers(controller).map((handler) => `${name}.${handler}`))
      .sort();
    const covered = protectedRoutes
      .map((route) => `${route.controller.name}.${route.handler}`)
      .sort();

    expect(covered).toEqual(expected);
  });
});

describe('RBAC enforcement — todas las rutas protegidas', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const payload = (rol: string) => ({ sub: '12345678-9', email: 'usuario@colegio.cl', rol });
  const token = (rol: UserRole) => jwt.sign(payload(rol));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_SECRET })],
      controllers: [
        InventoryController,
        TicketController,
        LocationController,
        LevelController,
        SubjectController,
        SoftwareController,
      ],
      providers: [
        { provide: InventoryService, useValue: serviceMock(['findOptions', 'findAll', 'create', 'update']) },
        { provide: TicketService, useValue: serviceMock(['findInbox', 'findBitacora', 'findAll', 'resolve', 'changeStatus', 'create']) },
        { provide: LocationService, useValue: serviceMock(['findAll', 'create', 'generateCourses', 'rename', 'remove']) },
        { provide: LevelService, useValue: serviceMock(['findAll', 'create', 'rename', 'remove']) },
        { provide: SubjectService, useValue: serviceMock(['findAll', 'create', 'update', 'remove']) },
        { provide: SoftwareService, useValue: serviceMock(['findAll', 'create', 'update', 'remove']) },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  function send(route: RouteCase, role?: UserRole) {
    const server = request(app.getHttpServer());
    let pending = server.get(route.path);

    if (route.method === 'post') pending = server.post(route.path);
    else if (route.method === 'patch') pending = server.patch(route.path);
    else if (route.method === 'delete') pending = server.delete(route.path);

    if (role) pending.set('Authorization', `Bearer ${token(role)}`);
    if (route.method === 'post' || route.method === 'patch') pending.send({});

    return pending;
  }

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

  it.each(protectedRoutes)('$method $path requiere autenticación', async (route) => {
    await send(route).expect(401);
  });

  it.each(protectedRoutes)('$method $path permite los roles declarados', async (route) => {
    const allowedRoles = rolesOf(route.controller, route.handler) ?? [];
    expect(allowedRoles.length, `${route.controller.name}.${route.handler} requiere roles`).toBeGreaterThan(0);

    for (const role of allowedRoles) {
      await send(route, role).expect(route.status);
    }
  });

  it.each(forbiddenRoleRoutes)('$route.method $route.path bloquea el rol $role', async ({ route, role }) => {
    await send(route, role).expect(403);
  });
});
