const BASIC_GRADES = 8;
const SECONDARY_GRADES = 4;

export function buildCourseNames(): string[] {
  const names: string[] = [];

  for (let grade = 1; grade <= BASIC_GRADES; grade += 1) {
    names.push(`${grade}° Básico A`, `${grade}° Básico B`);
  }

  for (let grade = 1; grade <= SECONDARY_GRADES; grade += 1) {
    names.push(`${grade}° Medio A`, `${grade}° Medio B`);
  }

  return names;
}
