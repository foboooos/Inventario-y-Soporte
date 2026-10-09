import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';

const INTERNAL_MESSAGE = 'Ocurrió un error inesperado. Intenta nuevamente en unos instantes.';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible en este momento. Intenta nuevamente en unos instantes.';

const STATUS_REASONS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '57P01',
  '57P02',
  '57P03',
]);

function errorCode(exception: unknown): string | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;

  const candidates = [exception, (exception as { driverError?: unknown }).driverError];
  for (const candidate of candidates) {
    if (typeof candidate === 'object' && candidate !== null && 'code' in candidate) {
      const code = (candidate as { code?: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  return undefined;
}

function isConnectionError(exception: unknown): boolean {
  const code = errorCode(exception);
  return code !== undefined && CONNECTION_ERROR_CODES.has(code);
}

function extractMessage(response: string | object): string | string[] {
  if (typeof response === 'string') return response;

  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string');
  return INTERNAL_MESSAGE;
}

function extractReason(status: number, response: string | object | undefined): string {
  if (response && typeof response === 'object' && typeof (response as { error?: unknown }).error === 'string') {
    return (response as { error: string }).error;
  }
  return STATUS_REASONS[status] ?? 'Error';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse();

    const status = this.resolveStatus(exception);
    const httpResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const internal = status >= HttpStatus.INTERNAL_SERVER_ERROR;

    if (internal) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    httpAdapter.reply(
      response,
      {
        statusCode: status,
        error: extractReason(status, httpResponse),
        message: internal ? this.publicMessage(exception) : extractMessage(httpResponse ?? INTERNAL_MESSAGE),
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      status,
    );
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    if (isConnectionError(exception)) return HttpStatus.SERVICE_UNAVAILABLE;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private publicMessage(exception: unknown): string {
    return isConnectionError(exception) ? UNAVAILABLE_MESSAGE : INTERNAL_MESSAGE;
  }
}
