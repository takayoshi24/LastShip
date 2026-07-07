import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import AvatarPicker, { loadAvatar, saveAvatar } from '../components/AvatarPicker.jsx';

export default function LobbyPage() {
  const { state, sendMsg, dispatch, reset } = useGame();
  const [waiting, setWaiting] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [spectateMode, setSpectateMode] = useState(false);
  const [avatar, setAvatar] = useState(loadAvatar);
  const navigate = useNavigate();

  useEffect(() => {
    if ((state.screen === 'placement' || state.screen === 'waiting') && state.roomCode) {
      navigate(`/game/${state.roomCode}`);
    }
    if (state.screen === 'spectator') {
      navigate(`/spectate`);
    }
  }, [state.screen, state.roomCode, navigate]);

  function updateAvatar(next) {
    setAvatar(next);
    saveAvatar(next);
    dispatch({ type: 'SET_MY_AVATAR', avatar: next });
  }

  function handleQuickMatch() {
    setWaiting(true);
    sendMsg({ type: 'QUICK_MATCH', avatar });
  }

  function handleCancelQueue() {
    setWaiting(false);
    sendMsg({ type: 'CANCEL_QUEUE' });
  }

  function handleCreateRoom() {
    sendMsg({ type: 'CREATE_ROOM', avatar });
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
    sendMsg({ type: 'PLAY_BOT', difficulty, avatar });
  }

  function handleDailyChallenge() {
    sendMsg({ type: 'PLAY_DAILY', avatar });
  }

  return (
    <div className="lobby">
      <h1>LastShip</h1>
      <p className="subtitle">Battleship — play online with a friend or face the bot</p>
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

      <AvatarPicker avatar={avatar} onChange={updateAvatar} />

      {waiting ? (
        <div className="panel">
          <p>Waiting for an opponent...</p>
          <button onClick={handleCancelQueue} className="btn-secondary">Cancel</button>
        </div>
      ) : (
        <div className="lobby-options">
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
                <input
                  type="checkbox"
                  checked={spectateMode}
                  onChange={e => setSpectateMode(e.target.checked)}
                />
                Spectate
              </label>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
