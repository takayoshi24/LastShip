import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import PlacementPhase from '../components/PlacementPhase.jsx';
import GameBoard from '../components/GameBoard.jsx';
import GameOver from '../components/GameOver.jsx';
import ReconnectOverlay from '../components/ReconnectOverlay.jsx';
import DisconnectBanner from '../components/DisconnectBanner.jsx';
import RoomInfo from '../components/RoomInfo.jsx';

export default function GamePage() {
  const { roomCode } = useParams();
  const { state, sendMsg } = useGame();
  const navigate = useNavigate();

  // Join room via URL once WebSocket is open (direct link / page refresh without token)
  useEffect(() => {
    if (state.connectionStatus !== 'connected') return;
    const hasToken = localStorage.getItem('lastship_player_token');
    const savedRoom = localStorage.getItem('lastship_room_code');
    if (!state.playerSlot && !(hasToken && savedRoom === roomCode)) {
      sendMsg({ type: 'JOIN_ROOM', roomCode });
    }
  }, [state.connectionStatus]);

  if (state.screen === 'lobby') {
    return (
      <div className="game-page">
        <p>Connecting to room {roomCode}...</p>
        {state.reconnectFailed && (
          <div>
            <p className="error-banner">Could not join room.</p>
            <button onClick={() => navigate('/')} className="btn-secondary">Back to Lobby</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-page">
      <RoomInfo roomCode={roomCode} />
      {state.opponentDisconnected && <DisconnectBanner />}
      {state.screen === 'waiting' && (
        <div className="panel">
          <p>Share this link with a friend to start the game:</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--accent)' }}>
            {window.location.href}
          </p>
          <p className="placement-hint">Waiting for opponent to connect...</p>
        </div>
      )}
      {state.screen === 'placement' && <PlacementPhase />}
      {state.screen === 'game' && <GameBoard />}
      {state.screen === 'gameover' && <GameOver />}
      {state.reconnecting && <ReconnectOverlay />}
    </div>
  );
}
