import { randomUUID } from 'crypto';

const tokens = new Map();
const TTL_MS = 10 * 60 * 1000;

export function createRankingToken(duration) {
  const token = randomUUID();
  tokens.set(token, { duration, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function consumeRankingToken(token) {
  const entry = tokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) return null;
  tokens.delete(token);
  return entry;
}
