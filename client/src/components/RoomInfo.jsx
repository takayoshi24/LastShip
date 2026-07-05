import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

export default function RoomInfo({ roomCode }) {
  const { state, sendMsg, reset } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/game/${roomCode}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function goHome() {
    if (state.screen === 'game') sendMsg({ type: 'FORFEIT' });
    reset();
    navigate('/');
  }

  return (
    <div className="room-info">
      <button onClick={goHome} className="btn-ghost room-info-home">← Home</button>
      <span className="room-code">Room: <strong>{roomCode}</strong></span>
      <button onClick={copy} className="btn-ghost">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
