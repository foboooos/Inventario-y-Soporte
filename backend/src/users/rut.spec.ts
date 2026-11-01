import { describe, expect, it } from 'vitest';
import { normalizeRut } from './rut.js';

describe('normalizeRut', () => {
  it('replaces a trailing 0 with K', () => {
    expect(normalizeRut('11.456.789-0')).toBe('11.456.789-K');
  });

  it('leaves other check digits untouched', () => {
    expect(normalizeRut('12.807.660-3')).toBe('12.807.660-3');
    expect(normalizeRut('9.876.543-K')).toBe('9.876.543-K');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRut(' 20.456.789-0 ')).toBe('20.456.789-K');
  });
});
