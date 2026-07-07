import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function RankingPage() {
  const [rankings, setRankings] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/rankings')
      .then(r => r.json())
      .then(setRankings)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="ranking-page">
      <div className="ranking-header">
        <Link to="/" className="btn-ghost">← Back</Link>
        <div>
          <h1>Impossible Ranking</h1>
          <p className="ranking-subtitle">Defeated the Impossible bot — sorted by fewest shots</p>
        </div>
      </div>

      {error && <p className="error-banner">Failed to load rankings.</p>}
      {rankings === null && !error && <p className="ranking-loading">Loading...</p>}
      {rankings?.length === 0 && (
        <p className="ranking-empty">No entries yet — be the first to conquer Impossible!</p>
      )}
      {rankings?.length > 0 && (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Shots</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((entry, i) => (
              <tr key={i} className={i === 0 ? 'rank-first' : i < 3 ? 'rank-top' : ''}>
                <td className="rank-num">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="rank-name">{entry.name}</td>
                <td className="rank-shots">{entry.shots}</td>
                <td className="rank-date">{new Date(entry.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
