import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';

function encryptionKey(): Buffer {
  if (!env.tokenEncryptionKey) {
    return createHash('sha256')
      .update(`pullpilot-token-encryption:${env.jwtSecret}`)
      .digest();
  }

  const key = Buffer.from(env.tokenEncryptionKey, 'base64url');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a base64url-encoded 32-byte key');
  }
  return key;
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptToken(value: string): string {
  const [version, encodedIv, encodedTag, encodedToken] = value.split(':');
  if (version !== FORMAT_VERSION || !encodedIv || !encodedTag || !encodedToken) {
    throw new Error('Stored GitHub token uses a legacy format; sign in again');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(encodedIv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedToken, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
