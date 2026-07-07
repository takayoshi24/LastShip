const KEY = 'lastship_stats';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? { games: [] }; } catch { return { games: [] }; }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function recordGame({ result, mode, shotsFired, shotsHit, shotsReceived, shotsReceivedHit }) {
  const data = load();
  data.games.push({ date: new Date().toISOString(), result, mode, shotsFired, shotsHit, shotsReceived, shotsReceivedHit });
  save(data);
}

export function getStats() {
  const { games } = load();
  if (games.length === 0) return null;

  const wins = games.filter(g => g.result === 'win').length;
  const totalShotsFired = games.reduce((s, g) => s + (g.shotsFired || 0), 0);
  const totalShotsHit   = games.reduce((s, g) => s + (g.shotsHit || 0), 0);

  let currentStreak = 0, bestStreak = 0, streak = 0;
  for (const g of [...games].reverse()) {
    if (g.result === 'win') { streak++; if (streak > bestStreak) bestStreak = streak; }
    else streak = 0;
  }
  currentStreak = streak;

  const byMode = {};
  for (const g of games) {
    byMode[g.mode] = byMode[g.mode] ?? { games: 0, wins: 0 };
    byMode[g.mode].games++;
    if (g.result === 'win') byMode[g.mode].wins++;
  }

  return {
    totalGames: games.length,
    wins,
    losses: games.length - wins,
    winRate: Math.round((wins / games.length) * 100),
    accuracy: totalShotsFired > 0 ? Math.round((totalShotsHit / totalShotsFired) * 100) : 0,
    currentStreak,
    bestStreak,
    byMode,
    recentGames: [...games].reverse().slice(0, 10),
  };
}

export function clearStats() {
  save({ games: [] });
}
