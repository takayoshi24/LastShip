import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribe } from '../services/websocket.js';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';
import ShipHealthBar from './ShipHealthBar.jsx';

const EMPTY_BOARD = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty'));

function MiniBoard({ board, label, avatar, healthHits, sunkList }) {
  return (
    <div className="spec-board-wrap">
      <div className="spec-board-header">
        {avatar && (
          <span className="spec-avatar" style={{ background: avatar.color }}>{avatar.icon}</span>
        )}
        <span className="spec-board-label">{label}</span>
      </div>
      <ShipHealthBar label="" hitsObj={healthHits} sunkList={sunkList} />
      <div className="spec-grid">
        {board.map((row, r) =>
          row.map((state, c) => (
            <span key={`${r}-${c}`} className={`spec-cell ${state}`} />
          ))
        )}
      </div>
    </div>
  );
}

export default function SpectatorView({ initialState }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(initialState.boards ?? [EMPTY_BOARD, EMPTY_BOARD]);
  const [currentTurn, setCurrentTurn] = useState(initialState.currentTurn);
  const [sunkShips, setSunkShips] = useState(initialState.sunkShips ?? [[], []]);
  const [shipHits, setShipHits] = useState(initialState.shipHits ?? [
    Object.fromEntries(FLEET_CONFIG.map(s => [s.name, 0])),
    Object.fromEntries(FLEET_CONFIG.map(s => [s.name, 0])),
  ]);
  const [avatars, setAvatars] = useState(initialState.avatars ?? [null, null]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [lastShot, setLastShot] = useState(null);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'SHOT_RESULT') {
        const { shooterSlot, coordinate, result, sunkShip, shipHits: newHits } = msg;
        const targetIdx = shooterSlot === 1 ? 1 : 0;
        const [r, c] = coordinate;
        setBoards(prev => {
          const next = prev.map(b => b.map(row => [...row]));
          if (sunkShip?.cells) {
            for (const [sr, sc] of sunkShip.cells) next[targetIdx][sr][sc] = 'sunk';
          } else {
            next[targetIdx][r][c] = result;
          }
          return next;
        });
        if (sunkShip) setSunkShips(prev => prev.map((arr, i) => i === targetIdx ? [...arr, sunkShip.name] : arr));
        if (newHits) setShipHits(newHits);
        setCurrentTurn(shooterSlot === 1 ? 2 : 1);
        setLastShot({ shooterSlot, coordinate, result, sunkShip });
      }
      if (msg.type === 'GAME_START') {
        setCurrentTurn(msg.firstPlayerSlot);
      }
      if (msg.type === 'GAME_OVER') {
        setGameOver(true);
        setWinner(msg.winner);
      }
    });
    return unsub;
  }, []);

  const colLabels = 'ABCDEFGHIJ';
  function coordLabel([r, c]) { return `${colLabels[c]}${r + 1}`; }

  return (
    <div className="spec-container">
      <div className="spec-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Leave</button>
        <span className="spec-badge">SPECTATING</span>
        {gameOver
          ? <span className="spec-status">Game over — Player {winner} wins</span>
          : <span className="spec-status">Player {currentTurn ?? '?'}'s turn</span>
        }
      </div>

      {lastShot && (
        <div className="spec-last-shot">
          Player {lastShot.shooterSlot} → {coordLabel(lastShot.coordinate)} —{' '}
          {lastShot.sunkShip ? `Sunk ${lastShot.sunkShip.name}!` : lastShot.result === 'hit' ? 'Hit!' : 'Miss'}
        </div>
      )}

      <div className="spec-boards">
        <MiniBoard
          board={boards[0]}
          label="Player 1 Fleet"
          avatar={avatars[0]}
          healthHits={shipHits[0]}
          sunkList={sunkShips[0]}
        />
        <MiniBoard
          board={boards[1]}
          label="Player 2 Fleet"
          avatar={avatars[1]}
          healthHits={shipHits[1]}
          sunkList={sunkShips[1]}
        />
      </div>
    </div>
  );
}
