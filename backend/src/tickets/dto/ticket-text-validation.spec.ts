import { validate } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto.js';
import { ResolveTicketDto } from './resolve-ticket.dto.js';

describe('validación de texto de tickets', () => {
  it.each([
    ['ubicacion', Object.assign(new CreateTicketDto(), { ubicacion: '   ', sintoma: 'Falla' })],
    ['sintoma', Object.assign(new CreateTicketDto(), { ubicacion: 'Sala 1', sintoma: '\t\n' })],
    ['causa_raiz', Object.assign(new ResolveTicketDto(), {
      causa_raiz: '   ', solucion_aplicada: 'Se reparó', estado_final: 'ACTIVO',
    })],
    ['solucion_aplicada', Object.assign(new ResolveTicketDto(), {
      causa_raiz: 'Falla eléctrica', solucion_aplicada: '\t\n', estado_final: 'ACTIVO',
    })],
  ])('rechaza texto compuesto solo por espacios en %s', async (field, dto) => {
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain(field);
  });
});
