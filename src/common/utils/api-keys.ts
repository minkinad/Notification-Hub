import { createHash, randomBytes } from 'crypto';

const API_KEY_PREFIX_LENGTH = 16;

export interface GeneratedApiKey {
  value: string;
  hash: string;
  prefix: string;
}

export function generateApiKey(prefix = 'pk'): GeneratedApiKey {
  const value = `${prefix}_${randomBytes(32).toString('base64url')}`;

  return {
    value,
    hash: hashApiKey(value),
    prefix: getApiKeyPrefix(value),
  };
}

export function hashApiKey(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function getApiKeyPrefix(value: string) {
  return value.slice(0, API_KEY_PREFIX_LENGTH);
}
