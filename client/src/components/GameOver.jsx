import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import ReplayViewer from './ReplayViewer.jsx';
import HeatMap from './HeatMap.jsx';
import { loadAccount, saveAccount, fetchMe } from '../services/account.js';

export default function GameOver() {
  const { state, reset, sendMsg } = useGame();
  const navigate = useNavigate();
  const won = state.winner === state.playerSlot;
  const [rankName, setRankName] = useState('');
  const [rankStatus, setRankStatus] = useState('idle');
  const [showReplay, setShowReplay] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [rematchState, setRematchState] = useState('idle'); // idle | waiting | offered
  const [eloChange, setEloChange] = useState(null); // { old, new }

  // Refresh ELO after PvP game if player is logged in
  useEffect(() => {
    if (state.gameMode !== 'pvp') return;
    const acct = loadAccount();
    if (!acct?.token) return;
    fetchMe(acct.token).then(fresh => {
      if (!fresh) return;
      if (fresh.elo !== acct.elo) {
        setEloChange({ old: acct.elo, new: fresh.elo });
        saveAccount({ ...acct, elo: fresh.elo });
      }
    });
  }, []);

  useEffect(() => {
    if (state.rematchOffered) setRematchState('offered');
  }, [state.rematchOffered]);

  function goLobby() {
    reset();
    navigate('/');
  }

  function handleRematch() {
    sendMsg({ type: 'REMATCH' });
    setRematchState('waiting');
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
  const isPvP = state.gameMode === 'pvp';

  return (
    <div className="gameover-overlay">
      <div className="gameover-card">
        <h2 className={won ? 'victory-text' : 'defeat-text'}>
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p>{won ? 'You sank the enemy fleet.' : 'Your fleet has been destroyed.'}</p>
        {eloChange && (
          <p className={`elo-delta ${eloChange.new >= eloChange.old ? 'elo-up' : 'elo-down'}`}>
            ELO {eloChange.old} → {eloChange.new}
            {' '}({eloChange.new >= eloChange.old ? '+' : ''}{eloChange.new - eloChange.old})
          </p>
        )}

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
                <input value={rankName} onChange={e => setRankName(e.target.value)}
                  placeholder="Your name" maxLength={20} disabled={rankStatus === 'submitting'} autoFocus />
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
          {state.replayData && (
            <button onClick={() => setShowReplay(true)} className="btn-secondary">Watch Replay</button>
          )}
          {state.replayData && (
            <button onClick={() => setShowHeatmap(true)} className="btn-secondary">Shot Analysis</button>
          )}

          {rematchState === 'idle' && (
            <button onClick={handleRematch} className="btn-rematch">
              {isPvP ? 'Rematch' : 'Play Again'}
            </button>
          )}
          {rematchState === 'waiting' && (
            <button className="btn-rematch waiting" disabled>
              Waiting for opponent…
            </button>
          )}
          {rematchState === 'offered' && (
            <button onClick={handleRematch} className="btn-rematch offered">
              Accept Rematch!
            </button>
          )}

          <button onClick={goLobby} className="btn-primary">Lobby</button>
        </div>
      </div>

      {showReplay && state.replayData && (
        <ReplayViewer data={state.replayData} onClose={() => setShowReplay(false)} />
      )}
      {showHeatmap && state.replayData && (
        <HeatMap
          shots={state.replayData.shots}
          playerSlot={state.playerSlot}
          onClose={() => setShowHeatmap(false)}
        />
      )}
    </div>
  );
}
