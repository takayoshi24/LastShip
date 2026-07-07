import { randomUUID } from 'crypto';

const tokens = new Map();
const TTL_MS = 10 * 60 * 1000;

export function createRankingToken(shots) {
  const token = randomUUID();
  tokens.set(token, { shots, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function consumeRankingToken(token) {
  const entry = tokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) return null;
  tokens.delete(token);
  return entry;
}
