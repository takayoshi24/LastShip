import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function todayISO() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function formatDuration(secs) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function Table({ rankings }) {
  if (rankings.length === 0) return <p className="ranking-empty">No entries yet.</p>;
  return (
    <table className="ranking-table">
      <thead>
        <tr><th>#</th><th>Name</th><th>Time</th><th>Date</th></tr>
      </thead>
      <tbody>
        {rankings.map((entry, i) => (
          <tr key={i} className={i === 0 ? 'rank-first' : i < 3 ? 'rank-top' : ''}>
            <td className="rank-num">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
            <td className="rank-name">{entry.name}</td>
            <td className="rank-shots">{formatDuration(entry.duration)}</td>
            <td className="rank-date">{new Date(entry.date).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RankingPage() {
  const [tab, setTab] = useState('daily');
  const [daily, setDaily] = useState(null);
  const [allTime, setAllTime] = useState(null);
  const [error, setError] = useState(false);
  const today = todayISO();

  useEffect(() => {
    if (tab === 'daily' && daily === null) {
      fetch(`/api/rankings/daily?day=${today}`)
        .then(r => r.json()).then(setDaily).catch(() => setError(true));
    }
    if (tab === 'alltime' && allTime === null) {
      fetch('/api/rankings')
        .then(r => r.json()).then(setAllTime).catch(() => setError(true));
    }
  }, [tab]);

  const current = tab === 'daily' ? daily : allTime;

  return (
    <div className="ranking-page">
      <div className="ranking-header">
        <Link to="/" className="btn-ghost">← Back</Link>
        <div>
          <h1>Hall of Fame</h1>
          <p className="ranking-subtitle">Defeated the Impossible bot — fastest clear wins</p>
        </div>
      </div>

      <div className="ranking-tabs">
        <button className={`ranking-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          Today's Challenge
        </button>
        <button className={`ranking-tab ${tab === 'alltime' ? 'active' : ''}`} onClick={() => setTab('alltime')}>
          All-Time Impossible
        </button>
      </div>

      {error && <p className="error-banner">Failed to load rankings.</p>}
      {current === null && !error && <p className="ranking-loading">Loading...</p>}
      {current !== null && (
        tab === 'daily' && current.length === 0
          ? <p className="ranking-empty">No one has conquered today's board yet — be the first!</p>
          : <Table rankings={current} />
      )}
    </div>
  );
}
