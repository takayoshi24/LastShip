import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, clearStats } from '../services/stats.js';

const MODE_LABELS = {
  pvp: 'PvP',
  'bot-easy': 'Bot Easy',
  'bot-medium': 'Bot Medium',
  'bot-hard': 'Bot Hard',
  'bot-superhard': 'Bot Super Hard',
  'bot-impossible': 'Bot Impossible',
  daily: 'Daily Challenge',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(() => getStats());

  function handleClear() {
    if (window.confirm('Clear all stats?')) {
      clearStats();
      setStats(null);
    }
  }

  return (
    <div className="stats-page">
      <div className="ranking-header">
        <Link to="/" className="btn-ghost">← Back</Link>
        <div>
          <h1>Your Stats</h1>
          <p className="ranking-subtitle">Session statistics stored locally</p>
        </div>
      </div>

      {!stats ? (
        <p className="ranking-empty">No games played yet.</p>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Games" value={stats.totalGames} />
            <StatCard label="Wins" value={stats.wins} sub={`${stats.winRate}% win rate`} />
            <StatCard label="Losses" value={stats.losses} />
            <StatCard label="Accuracy" value={`${stats.accuracy}%`} sub="shots on target" />
            <StatCard label="Win Streak" value={stats.currentStreak} sub={`Best: ${stats.bestStreak}`} />
          </div>

          <h3 className="stats-section-title">By Mode</h3>
          <table className="ranking-table">
            <thead>
              <tr><th>Mode</th><th>Games</th><th>Wins</th><th>Win %</th></tr>
            </thead>
            <tbody>
              {Object.entries(stats.byMode).map(([mode, d]) => (
                <tr key={mode}>
                  <td>{MODE_LABELS[mode] ?? mode}</td>
                  <td>{d.games}</td>
                  <td>{d.wins}</td>
                  <td>{Math.round((d.wins / d.games) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="stats-section-title">Recent Games</h3>
          <table className="ranking-table">
            <thead>
              <tr><th>Date</th><th>Mode</th><th>Result</th><th>Accuracy</th></tr>
            </thead>
            <tbody>
              {stats.recentGames.map((g, i) => (
                <tr key={i} className={g.result === 'win' ? 'rank-top' : ''}>
                  <td>{new Date(g.date).toLocaleDateString()}</td>
                  <td>{MODE_LABELS[g.mode] ?? g.mode}</td>
                  <td>{g.result === 'win' ? '✓ Win' : '✗ Loss'}</td>
                  <td>{g.shotsFired > 0 ? `${Math.round((g.shotsHit / g.shotsFired) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleClear} className="btn-secondary stats-clear">Clear All Stats</button>
        </>
      )}
    </div>
  );
}
