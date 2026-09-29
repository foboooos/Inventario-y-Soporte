const BASIC_GRADES = 8;
const SECONDARY_GRADES = 4;
const PARALLELS = ['A', 'B'];

export function buildEducationalLevelNames(): string[] {
  const names = ['Pre-Kinder', 'Kinder'];

  for (let grade = 1; grade <= BASIC_GRADES; grade += 1) {
    for (const parallel of PARALLELS) {
      names.push(`${grade}° Básico ${parallel}`);
    }
  }

  for (let grade = 1; grade <= SECONDARY_GRADES; grade += 1) {
    for (const parallel of PARALLELS) {
      names.push(`${grade}° Medio ${parallel}`);
    }
  }

  return names;
}
