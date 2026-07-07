import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../../data');
const FILE = join(DATA_DIR, 'accounts.json');

const DEFAULT_ELO = 1000;
const K = 32;

function sha(pin) {
  return createHash('sha256').update(String(pin)).digest('hex');
}

function load() {
  if (!existsSync(FILE)) return {};
  try { return JSON.parse(readFileSync(FILE, 'utf-8')); } catch { return {}; }
}

function save(accounts) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(accounts, null, 2));
}

export function register(name, pin) {
  const trimmed = (name ?? '').trim().slice(0, 20);
  if (trimmed.length < 2) return { error: 'Name must be 2–20 characters' };
  if (String(pin ?? '').length < 4) return { error: 'PIN must be at least 4 digits' };

  const accounts = load();
  if (Object.values(accounts).some(a => a.name.toLowerCase() === trimmed.toLowerCase()))
    return { error: 'Name already taken' };

  const token = uuidv4();
  accounts[token] = {
    name: trimmed,
    pinHash: sha(pin),
    elo: DEFAULT_ELO,
    createdAt: new Date().toISOString().slice(0, 10),
    pvp: { wins: 0, losses: 0, shotsFired: 0, shotsHit: 0 },
  };
  save(accounts);
  return { token, name: trimmed, elo: DEFAULT_ELO };
}

export function login(name, pin) {
  const accounts = load();
  const entry = Object.entries(accounts).find(
    ([, a]) => a.name.toLowerCase() === (name ?? '').trim().toLowerCase()
  );
  if (!entry) return { error: 'Name not found' };
  const [token, account] = entry;
  if (account.pinHash !== sha(pin)) return { error: 'Wrong PIN' };
  return { token, name: account.name, elo: account.elo };
}

export function getAccount(token) {
  if (!token) return null;
  const accounts = load();
  const a = accounts[token];
  if (!a) return null;
  return { name: a.name, elo: a.elo, pvp: a.pvp };
}

export function updateEloAndStats(token1, token2, winnerToken, shots = []) {
  const accounts = load();
  const a1 = accounts[token1];
  const a2 = accounts[token2];
  if (!a1 || !a2) return null;

  const exp1 = 1 / (1 + Math.pow(10, (a2.elo - a1.elo) / 400));
  const score1 = winnerToken === token1 ? 1 : 0;
  a1.elo = Math.max(0, Math.round(a1.elo + K * (score1 - exp1)));
  a2.elo = Math.max(0, Math.round(a2.elo + K * ((1 - score1) - (1 - exp1))));

  if (winnerToken === token1) { a1.pvp.wins++; a2.pvp.losses++; }
  else { a2.pvp.wins++; a1.pvp.losses++; }

  for (const { coordinate: _c, result, shooterSlot } of shots) {
    const tok = shooterSlot === 1 ? token1 : token2;
    const acc = accounts[tok];
    if (!acc) continue;
    acc.pvp.shotsFired = (acc.pvp.shotsFired ?? 0) + 1;
    if (result === 'hit' || result === 'sunk')
      acc.pvp.shotsHit = (acc.pvp.shotsHit ?? 0) + 1;
  }

  save(accounts);
  return { elo1: a1.elo, elo2: a2.elo };
}
