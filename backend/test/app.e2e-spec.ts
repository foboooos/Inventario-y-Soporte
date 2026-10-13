import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

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

  afterEach(async () => {
    await app.close();
  });
});
