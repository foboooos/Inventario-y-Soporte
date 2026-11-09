import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('rechaza credenciales inválidas en el login', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: 'nadie', password: 'contraseña-invalida' })
      .expect(401);
  });

  it('protege el inventario sin token', () => {
    return request(app.getHttpServer()).get('/inventory').expect(401);
  });

  it('protege /auth/me sin token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('expone el estado de salud', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});
