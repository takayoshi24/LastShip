import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import AvatarPicker, { loadAvatar, saveAvatar } from '../components/AvatarPicker.jsx';
import ThemePicker from '../components/ThemePicker.jsx';
import InfoModal from '../components/InfoModal.jsx';
import AccountModal from '../components/AccountModal.jsx';
import { loadAccount, clearAccount } from '../services/account.js';

export default function LobbyPage() {
  const { state, sendMsg, dispatch, reset } = useGame();
  const [waiting, setWaiting] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [spectateMode, setSpectateMode] = useState(false);
  const [avatar, setAvatar] = useState(loadAvatar);
  const [salvo, setSalvo] = useState(false);
  const [fog, setFog] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [account, setAccount] = useState(loadAccount);
  const navigate = useNavigate();

  useEffect(() => {
    if ((state.screen === 'placement' || state.screen === 'waiting') && state.roomCode) {
      navigate(`/game/${state.roomCode}`);
    }
    if (state.screen === 'spectator') navigate('/spectate');
  }, [state.screen, state.roomCode, navigate]);

  function updateAvatar(next) {
    setAvatar(next);
    saveAvatar(next);
    dispatch({ type: 'SET_MY_AVATAR', avatar: next });
  }

  const gameOptions = { salvo, fog };

  function handleQuickMatch() {
    setWaiting(true);
    sendMsg({ type: 'QUICK_MATCH', avatar, gameOptions, accountToken: account?.token ?? null });
  }

  function handleCancelQueue() {
    setWaiting(false);
    sendMsg({ type: 'CANCEL_QUEUE' });
  }

  function handleCreateRoom() {
    sendMsg({ type: 'CREATE_ROOM', avatar, gameOptions });
  }

  function handleJoinRoom(e) {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const code = roomInput.trim().toUpperCase();
    if (spectateMode) {
      sendMsg({ type: 'SPECTATE', roomCode: code });
    } else {
      sendMsg({ type: 'JOIN_ROOM', roomCode: code, avatar });
    }
  }

  function handlePlayBot(difficulty) {
    sendMsg({ type: 'PLAY_BOT', difficulty, avatar, gameOptions });
  }

  function handleDailyChallenge() {
    sendMsg({ type: 'PLAY_DAILY', avatar });
  }

  function handleLogout() {
    clearAccount();
    setAccount(null);
  }

  return (
    <div className="lobby">
      <div className="lobby-title-row">
        <h1>LastShip</h1>
        <button className="info-btn" onClick={() => setShowInfo(true)} title="How to play">?</button>
      </div>
      <p className="subtitle">Battleship — play online with a friend or face the bot</p>
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showAccount && (
        <AccountModal
          onClose={() => setShowAccount(false)}
          onAccount={data => setAccount(data)}
        />
      )}

      <div className="lobby-links">
        <Link to="/ranking" className="ranking-lobby-link">Hall of Fame</Link>
        <Link to="/stats" className="ranking-lobby-link">My Stats</Link>
      </div>
      {state.onlineCount > 0 && (
        <p className="online-count">{state.onlineCount} online</p>
      )}

      {state.reconnectFailed && (
        <p className="error-banner">Connection lost. Start a new game.</p>
      )}

      {account ? (
        <div className="account-bar">
          <span className="account-name">{account.name}</span>
          <span className="account-elo">ELO {account.elo}</span>
          <button className="btn-ghost account-logout" onClick={handleLogout}>Log out</button>
        </div>
      ) : (
        <button className="btn-ghost account-login-btn" onClick={() => setShowAccount(true)}>
          Log in / Register
        </button>
      )}

      <AvatarPicker avatar={avatar} onChange={updateAvatar} />
      <ThemePicker />

      {waiting ? (
        <div className="panel">
          <p>Waiting for an opponent{salvo || fog ? ` (${[salvo && 'Salvo', fog && 'Fog'].filter(Boolean).join(' + ')})` : ''}...</p>
          <button onClick={handleCancelQueue} className="btn-secondary">Cancel</button>
        </div>
      ) : (
        <div className="lobby-options">
          <div className="mode-toggles">
            <label className="salvo-toggle">
              <input type="checkbox" checked={salvo} onChange={e => setSalvo(e.target.checked)} />
              <span>Salvo mode — fire one shot per surviving ship each turn</span>
            </label>
            <label className="salvo-toggle">
              <input type="checkbox" checked={fog} onChange={e => setFog(e.target.checked)} />
              <span>Fog of war — your fleet board is hidden during play</span>
            </label>
          </div>

          <button onClick={handleQuickMatch} className="btn-primary">Quick Match</button>
          <button onClick={handleCreateRoom} className="btn-primary">Create Private Room</button>

          <div className="bot-section">
            <span className="bot-label">Play vs Bot</span>
            <div className="bot-difficulty">
              <button onClick={() => handlePlayBot('easy')} className="btn-difficulty easy">Easy</button>
              <button onClick={() => handlePlayBot('medium')} className="btn-difficulty medium">Medium</button>
              <button onClick={() => handlePlayBot('hard')} className="btn-difficulty hard">Hard</button>
              <button onClick={() => handlePlayBot('superhard')} className="btn-difficulty superhard">Super Hard</button>
              <button onClick={() => handlePlayBot('impossible')} className="btn-difficulty impossible">Impossible</button>
            </div>
          </div>

          <button onClick={handleDailyChallenge} className="btn-daily">
            Daily Challenge — Impossible
          </button>

          <div className="divider">or join a room</div>
          <form onSubmit={handleJoinRoom} className="join-form">
            <input
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              placeholder="Room code"
              maxLength={6}
            />
            <div className="join-actions">
              <button type="submit" className="btn-primary" disabled={!roomInput.trim()}>
                {spectateMode ? 'Watch' : 'Join'}
              </button>
              <label className="spectate-toggle">
                <input type="checkbox" checked={spectateMode}
                  onChange={e => setSpectateMode(e.target.checked)} />
                Spectate
              </label>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
