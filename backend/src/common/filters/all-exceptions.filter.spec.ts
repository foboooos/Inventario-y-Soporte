import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

const INTERNAL_MESSAGE = 'Ocurrió un error inesperado. Intenta nuevamente en unos instantes.';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible en este momento. Intenta nuevamente en unos instantes.';

function setup() {
  const reply = vi.fn();
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/inventario' }),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  const httpAdapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost;

  return { filter: new AllExceptionsFilter(httpAdapterHost), host, reply };
}

function exposed(reply: ReturnType<typeof vi.fn>) {
  const [, body, status] = reply.mock.calls[0];
  return { body: body as Record<string, unknown>, status: status as number, message: (body as { message: unknown }).message };
}

describe('AllExceptionsFilter', () => {
  let errorSpy: MockInstance

  beforeEach(() => {
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('deja pasar los errores de negocio con su mensaje y estado', () => {
    const { filter, host, reply } = setup();

    filter.catch(new NotFoundException('Dispositivo no encontrado'), host);

    const { status, message, body } = exposed(reply);
    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(message).toBe('Dispositivo no encontrado');
    expect(body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/inventario' });
    expect(typeof body.timestamp).toBe('string');
  });

  it('conserva la lista de mensajes de validación sin modificarla', () => {
    const { filter, host, reply } = setup();

    filter.catch(new BadRequestException(['estado must be a valid enum value']), host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(message).toEqual(['estado must be a valid enum value']);
  });

  it('oculta el detalle técnico de un 500 controlado', () => {
    const { filter, host, reply } = setup();

    filter.catch(new InternalServerErrorException('No se pudo obtener la secuencia de tickets'), host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(message).toBe(INTERNAL_MESSAGE);
    expect(message).not.toContain('secuencia');
  });

  it('reemplaza un error desconocido por un mensaje genérico sin filtrar detalles', () => {
    const { filter, host, reply } = setup();

    filter.catch(new Error('relation "usuarios" does not exist'), host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(message).toBe(INTERNAL_MESSAGE);
  });

  it('responde 503 cuando se cae la conexión a la base de datos', () => {
    const { filter, host, reply } = setup();
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });

    filter.catch(error, host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(message).toBe(UNAVAILABLE_MESSAGE);
  });

  it('detecta la caída de conexión envuelta en un QueryFailedError de TypeORM', () => {
    const { filter, host, reply } = setup();
    const driverError = Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' });

    filter.catch(new QueryFailedError('SELECT 1', undefined, driverError), host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(message).toBe(UNAVAILABLE_MESSAGE);
  });

  it('responde 500 genérico ante otros errores de base de datos', () => {
    const { filter, host, reply } = setup();
    const driverError = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

    filter.catch(new QueryFailedError('INSERT INTO usuarios', [], driverError), host);

    const { status, message } = exposed(reply);
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(message).toBe(INTERNAL_MESSAGE);
  });

  it('registra en el log los errores internos pero no los de negocio', () => {
    const internal = setup();
    internal.filter.catch(new Error('boom'), internal.host);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockClear();

    const business = setup();
    business.filter.catch(new NotFoundException('Dispositivo no encontrado'), business.host);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
