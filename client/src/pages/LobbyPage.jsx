import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

export default function LobbyPage() {
  const { state, sendMsg, reset } = useGame();
  const [waiting, setWaiting] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if ((state.screen === 'placement' || state.screen === 'waiting') && state.roomCode) {
      navigate(`/game/${state.roomCode}`);
    }
  }, [state.screen, state.roomCode, navigate]);

  function handleQuickMatch() {
    setWaiting(true);
    sendMsg({ type: 'QUICK_MATCH' });
  }

  function handleCancelQueue() {
    setWaiting(false);
    sendMsg({ type: 'CANCEL_QUEUE' });
  }

  function handleCreateRoom() {
    sendMsg({ type: 'CREATE_ROOM' });
  }

  function handleJoinRoom(e) {
    e.preventDefault();
    if (roomInput.trim()) sendMsg({ type: 'JOIN_ROOM', roomCode: roomInput.trim().toUpperCase() });
  }

  function handlePlayBot(difficulty) {
    sendMsg({ type: 'PLAY_BOT', difficulty });
  }

  return (
    <div className="lobby">
      <h1>LastShip</h1>
      <p className="subtitle">Battleship — play online with a friend or face the bot</p>
      <Link to="/ranking" className="ranking-lobby-link">Hall of Fame</Link>
      {state.onlineCount > 0 && (
        <p className="online-count">{state.onlineCount} online</p>
      )}

      {state.reconnectFailed && (
        <p className="error-banner">Connection lost. Start a new game.</p>
      )}

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

          <div className="divider">or join a room</div>
          <form onSubmit={handleJoinRoom} className="join-form">
            <input
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              placeholder="Room code"
              maxLength={6}
            />
            <button type="submit" className="btn-primary">Join</button>
          </form>
        </div>
      )}
    </div>
  );
}
