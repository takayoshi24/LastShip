import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

export default function GameOver() {
  const { state, reset } = useGame();
  const navigate = useNavigate();
  const won = state.winner === state.playerSlot;

  function goLobby() {
    reset();
    navigate('/');
  }

  function playAgain() {
    reset();
    navigate('/');
  }

  return (
    <div className="gameover-overlay">
      <div className="gameover-card">
        <h2 className={won ? 'victory-text' : 'defeat-text'}>
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p>{won ? 'You sank the enemy fleet.' : 'Your fleet has been destroyed.'}</p>
        <div className="gameover-actions">
          <button onClick={playAgain} className="btn-primary">Play Again</button>
          <button onClick={goLobby} className="btn-secondary">Back to Lobby</button>
        </div>
      </div>
    </div>
  );
}
