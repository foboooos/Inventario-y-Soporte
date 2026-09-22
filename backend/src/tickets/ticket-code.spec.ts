import { describe, expect, it } from 'vitest';
import { formatTicketCode } from './ticket-code.js';

describe('formatTicketCode', () => {
  it('formats the yearly ticket sequence with four digits', () => {
    expect(formatTicketCode(2026, 1)).toBe('TCK-2026-0001');
    expect(formatTicketCode(2026, 42)).toBe('TCK-2026-0042');
  });

  it('does not truncate sequences larger than four digits', () => {
    expect(formatTicketCode(2026, 10000)).toBe('TCK-2026-10000');
  });

  it('rejects invalid years and sequences', () => {
    expect(() => formatTicketCode(0, 1)).toThrow(RangeError);
    expect(() => formatTicketCode(2026, 0)).toThrow(RangeError);
  });
});
