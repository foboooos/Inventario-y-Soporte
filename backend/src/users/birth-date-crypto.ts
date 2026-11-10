import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres para cifrar fechas de nacimiento');
  }

  return createHash('sha256').update(`inventario-soporte:fecha-nacimiento:${secret}`).digest();
}

export function encryptBirthDate(date: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(date, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptBirthDate(value: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Formato de fecha de nacimiento cifrada inválido');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
