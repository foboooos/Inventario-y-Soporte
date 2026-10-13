export type PaginationItem = number | 'ellipsis'

/**
 * Cantidad fija de ranuras para que la paginación no se desplace al avanzar.
 * Siempre devuelve `primero + bloque + … + último` con el mismo largo.
 */
const MAX_SLOTS = 7

export function getPageNumbers(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= MAX_SLOTS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const last = totalPages
  const nearStart = currentPage <= 3
  const nearEnd = currentPage >= last - 2
  const blockSize = nearStart || nearEnd ? 4 : 3
  const blockStart = nearStart ? 2 : nearEnd ? last - blockSize : currentPage - 1

  const block: number[] = []
  for (let index = 0; index < blockSize; index += 1) {
    block.push(blockStart + index)
  }

  const items: PaginationItem[] = [1]

  if (block[0] > 2) items.push('ellipsis')
  items.push(...block)
  if (block[block.length - 1] < last - 1) items.push('ellipsis')

  items.push(last)

  return items
}
