import { randomUUID } from 'crypto';

const tokens = new Map();
const TTL_MS = 10 * 60 * 1000;

export function createRankingToken(duration, day = null) {
  const token = randomUUID();
  tokens.set(token, { duration, day, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function consumeRankingToken(token) {
  const entry = tokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) return null;
  tokens.delete(token);
  return entry;
}
