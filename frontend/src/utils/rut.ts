export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean

  const body = clean.slice(0, -1)
  const checkDigit = clean.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formattedBody}-${checkDigit}`
}

export function rutCaretPosition(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0

  let count = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/[0-9kK]/.test(formatted[index])) {
      count += 1
      if (count === digitsBefore) return index + 1
    }
  }

  return formatted.length
}
