import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const FILE = join(DATA_DIR, 'rankings.json');
const MAX_ENTRIES = 100;

const dailyFile = (day) => join(DATA_DIR, `daily-${day}.json`);

function ensureFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, '[]', 'utf-8');
}

export function getRankings() {
  ensureFile();
  return JSON.parse(readFileSync(FILE, 'utf-8'));
}

export function addEntry(name, duration) {
  const rankings = getRankings();
  rankings.push({ name, duration, date: new Date().toISOString() });
  rankings.sort((a, b) => a.duration - b.duration || new Date(a.date) - new Date(b.date));
  const trimmed = rankings.slice(0, MAX_ENTRIES);
  writeFileSync(FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  return trimmed;
}

export function getDailyRankings(day) {
  ensureFile();
  const f = dailyFile(day);
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf-8'));
}

export function addDailyEntry(name, duration, day) {
  ensureFile();
  const rankings = getDailyRankings(day);
  rankings.push({ name, duration, date: new Date().toISOString() });
  rankings.sort((a, b) => a.duration - b.duration || new Date(a.date) - new Date(b.date));
  const trimmed = rankings.slice(0, MAX_ENTRIES);
  writeFileSync(dailyFile(day), JSON.stringify(trimmed, null, 2), 'utf-8');
  return trimmed;
}
