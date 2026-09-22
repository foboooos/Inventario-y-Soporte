export function formatTicketCode(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError('El año del ticket debe ser un entero positivo');
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError('El correlativo del ticket debe ser un entero positivo');
  }

  return `TCK-${year}-${String(sequence).padStart(4, '0')}`;
}
