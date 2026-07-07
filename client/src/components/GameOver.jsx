import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

export default function GameOver() {
  const { state, reset } = useGame();
  const navigate = useNavigate();
  const won = state.winner === state.playerSlot;
  const [rankName, setRankName] = useState('');
  const [rankStatus, setRankStatus] = useState('idle');

  function goLobby() {
    reset();
    navigate('/');
  }

  async function handleRankSubmit(e) {
    e.preventDefault();
    if (!rankName.trim()) return;
    setRankStatus('submitting');
    try {
      const res = await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rankName.trim(), token: state.rankingToken }),
      });
      setRankStatus(res.ok ? 'done' : 'error');
    } catch {
      setRankStatus('error');
    }
  }

  const isDaily = !!state.rankingDay;

  return (
    <div className="gameover-overlay">
      <div className="gameover-card">
        <h2 className={won ? 'victory-text' : 'defeat-text'}>
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p>{won ? 'You sank the enemy fleet.' : 'Your fleet has been destroyed.'}</p>

        {won && state.rankingToken && (
          <div className="ranking-submit">
            <p className="ranking-unlock">
              {isDaily ? "Today's challenge complete — enter the daily ranking!" : 'You conquered Impossible — enter the hall of fame!'}
            </p>
            {rankStatus === 'done' ? (
              <p className="ranking-success">
                Saved! <Link to="/ranking" className="ranking-link" onClick={reset}>View Rankings</Link>
              </p>
            ) : (
              <form onSubmit={handleRankSubmit} className="ranking-form">
                <input
                  value={rankName}
                  onChange={e => setRankName(e.target.value)}
                  placeholder="Your name"
                  maxLength={20}
                  disabled={rankStatus === 'submitting'}
                  autoFocus
                />
                <button type="submit" className="btn-primary"
                  disabled={rankStatus === 'submitting' || !rankName.trim()}>
                  {rankStatus === 'submitting' ? 'Saving...' : 'Submit'}
                </button>
                {rankStatus === 'error' && <p className="error-banner">Failed to save. Try again.</p>}
              </form>
            )}
          </div>
        )}

        <div className="gameover-actions">
          <button onClick={goLobby} className="btn-primary">Play Again</button>
          <button onClick={goLobby} className="btn-secondary">Back to Lobby</button>
        </div>
      </div>
    </div>
  );
}
