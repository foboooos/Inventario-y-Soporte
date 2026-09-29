import { describe, expect, it } from 'vitest';
import { buildEducationalLevelNames } from './educational-level-names.js';

describe('buildEducationalLevelNames', () => {
  it('builds the standard Chilean levels with A/B parallels', () => {
    const names = buildEducationalLevelNames();

    expect(names).toContain('Pre-Kinder');
    expect(names).toContain('Kinder');
    expect(names).toContain('1° Básico A');
    expect(names).toContain('8° Básico B');
    expect(names).toContain('1° Medio A');
    expect(names).toContain('4° Medio B');
    expect(names).toHaveLength(2 + 8 * 2 + 4 * 2);
  });

  it('keeps the pedagogical order and drops the old names', () => {
    const names = buildEducationalLevelNames();

    expect(names.slice(0, 4)).toEqual(['Pre-Kinder', 'Kinder', '1° Básico A', '1° Básico B']);
    expect(names).not.toContain('Pre-Escolar');
    expect(names).not.toContain('1° Básico');
  });
});
