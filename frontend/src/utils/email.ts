export const USER_EMAIL_DOMAIN = '@davincicoquimbo.cl'

export function localPartOfEmail(email: string): string {
  const atIndex = email.indexOf('@')
  return atIndex === -1 ? email : email.slice(0, atIndex)
}

export function buildUserEmail(localPart: string): string {
  return `${localPartOfEmail(localPart.trim())}${USER_EMAIL_DOMAIN}`
}
