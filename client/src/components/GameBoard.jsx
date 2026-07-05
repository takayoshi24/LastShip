import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';
import CountdownTimer from './CountdownTimer.jsx';
import SunkShipsList from './SunkShipsList.jsx';
import { triggerExplosion } from '../services/explosion.js';

function cellsFor(origin, orientation, size) {
  const [r, c] = origin;
  return Array.from({ length: size }, (_, i) =>
    orientation === 'H' ? [r, c + i] : [r + i, c]
  );
}

function buildBoardFromPlacements(placements) {
  const board = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ state: 'empty', shipName: null }))
  );
  for (const p of placements) {
    const cfg = FLEET_CONFIG.find(s => s.name === p.shipName);
    for (const [r, c] of cellsFor(p.origin, p.orientation, cfg.size)) {
      board[r][c] = { state: 'ship', shipName: p.shipName };
    }
  }
  return board;
}

const cellVariants = {
  idle: { scale: 1, backgroundColor: 'var(--cell-empty)' },
  hit: { scale: [1, 1.3, 1], backgroundColor: 'var(--cell-hit)', transition: { duration: 0.4 } },
  miss: { scale: [1, 0.85, 1], backgroundColor: 'var(--cell-miss)', transition: { duration: 0.3 } },
  sunk: { scale: 1, backgroundColor: 'var(--cell-sunk)', transition: { duration: 0.5 } },
  ship: { scale: 1, backgroundColor: 'var(--cell-ship)' },
};

export default function GameBoard() {
  const { state, sendMsg, dispatch } = useGame();
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const attackGridRef = useRef(null);
  const [animatingCells, setAnimatingCells] = useState({});

  const isMyTurn = state.currentTurn === state.playerSlot;
  const myIndex = state.playerSlot - 1;
  const oppIndex = myIndex === 0 ? 1 : 0;

  const myBoard = state.myPlacements?.length
    ? buildBoardFromPlacements(state.myPlacements)
    : state.myBoard ?? [];

  const attackBoard = state.attackBoard ?? Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ state: 'empty', shipName: null }))
  );

  useEffect(() => {
    if (!state.lastShotResult) return;
    const { coordinate, result, sunkShip } = state.lastShotResult;
    const [r, c] = coordinate;
    const key = `${r},${c}`;

    setAnimatingCells(prev => ({ ...prev, [key]: result === 'sunk' ? 'sunk' : result }));

    if (sunkShip) {
      dispatch({ type: 'ADD_SUNK', targetIndex: oppIndex, shipName: sunkShip.name });

      // Show explosion on canvas
      if (canvasRef.current && attackGridRef.current) {
        const gridRect = attackGridRef.current.getBoundingClientRect();
        const gap = 2; // matches CSS gap: 2px on .grid
        const cellWidth = (gridRect.width - gap * (GRID_SIZE - 1)) / GRID_SIZE;
        const stride = cellWidth + gap;
        const positions = sunkShip.cells.map(([cr, cc]) => ({
          x: gridRect.left + cc * stride + cellWidth / 2,
          y: gridRect.top + cr * stride + cellWidth / 2,
        }));
        triggerExplosion(canvasRef.current, positions);
      }

      for (const [cr, cc] of sunkShip.cells) {
        setAnimatingCells(prev => ({ ...prev, [`${cr},${cc}`]: 'sunk' }));
      }
    }

    if (result !== 'sunk') {
      // Update attack board cell
    }

    dispatch({ type: 'UPDATE_TURN', turn: state.currentTurn === 1 ? 2 : 1 });
  }, [state.lastShotResult]);

  function handleFire(r, c) {
    if (!isMyTurn) return;
    const cell = attackBoard[r]?.[c];
    if (cell && (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk')) return;
    sendMsg({ type: 'FIRE', coordinate: [r, c] });
  }

  function getCellState(board, r, c, animKey) {
    if (animatingCells[`${r},${c}`]) return animatingCells[`${r},${c}`];
    return board?.[r]?.[c]?.state ?? 'empty';
  }

  return (
    <div className="game-board">
      <canvas ref={canvasRef} className="explosion-canvas" />

      <div className="turn-bar">
        <span className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opp-turn'}`}>
          {isMyTurn ? 'Your turn — fire!' : "Opponent's turn"}
        </span>
        {isMyTurn && <CountdownTimer seconds={300} key={state.currentTurn} onExpire={() => {}} />}
      </div>

      <div className="boards-container">
        <div className="board-section">
          <h3>Your Fleet</h3>
          <div className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 36px)` }}>
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const s = getCellState(myBoard, r, c);
                return (
                  <motion.div
                    key={`my-${r}-${c}`}
                    className={`grid-cell ${s}`}
                    variants={cellVariants}
                    animate={s}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="board-section">
          <h3>Your Attack</h3>
          <div className={`grid ${isMyTurn ? 'interactive' : 'locked'}`} ref={attackGridRef} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 36px)` }}>
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const s = getCellState(attackBoard, r, c);
                const clickable = isMyTurn && s === 'empty';
                return (
                  <motion.div
                    key={`atk-${r}-${c}`}
                    className={`grid-cell ${s} ${clickable ? 'clickable' : ''}`}
                    variants={cellVariants}
                    animate={s}
                    onClick={() => handleFire(r, c)}
                    whileHover={clickable ? { scale: 1.1 } : {}}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <SunkShipsList sunkShips={state.sunkShips} playerSlot={state.playerSlot} />
    </div>
  );
}
