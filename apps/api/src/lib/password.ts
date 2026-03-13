import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}
