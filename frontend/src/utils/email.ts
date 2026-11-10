export const USER_EMAIL_DOMAIN = '@davincicoquimbo.cl'

export function localPartOfEmail(email: string): string {
  const atIndex = email.indexOf('@')
  return atIndex === -1 ? email : email.slice(0, atIndex)
}

export function buildUserEmail(localPart: string): string {
  return `${localPartOfEmail(localPart.trim())}${USER_EMAIL_DOMAIN}`
}

export function emailFromName(name: string): string {
  const localPart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')

  return buildUserEmail(localPart)
}
