import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

export default function ReconnectOverlay() {
  const { state, reset } = useGame();
  const navigate = useNavigate();

  if (state.reconnectFailed) {
    return (
      <div className="reconnect-overlay">
        <div className="reconnect-card">
          <h3>Connection lost</h3>
          <p>Could not reconnect to the game.</p>
          <button onClick={() => { reset(); navigate('/'); }} className="btn-primary">
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reconnect-overlay">
      <div className="reconnect-card">
        <h3>Reconnecting...</h3>
        <p>Attempting to restore your game session.</p>
        <div className="spinner" />
      </div>
    </div>
  );
}
