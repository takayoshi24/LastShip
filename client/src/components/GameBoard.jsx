import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GiHarryPotterSkull } from 'react-icons/gi';
import { SiFireship, SiSonarqubeserver } from 'react-icons/si';
import { LuEqualApproximately, LuVolume2, LuVolumeX } from 'react-icons/lu';
import { FaShip } from 'react-icons/fa';
import { useGame } from '../context/GameContext.jsx';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';
import CountdownTimer from './CountdownTimer.jsx';
import ShipHealthBar from './ShipHealthBar.jsx';
import ChatBox from './ChatBox.jsx';
import { triggerExplosion } from '../services/explosion.js';
import { cellsFor } from '../utils/grid.js';

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

const sonarAnim = {
  animate: {
    scale:   [0, 1.2, 0],
    opacity: [1, 0,   0],
  },
  transition: {
    duration: 2.2,
    repeat: Infinity,
    ease: 'easeOut',
    times: [0, 0.6, 1],
  },
};

const fireShipAnim = {
  style: { transformOrigin: '50% 100%' },
  animate: {
    rotate:  [0, 3, 1, -2, 4, -1, 3, -3, 1, 2, -1, 2, 0],
    scaleY:  [1, 1.04, 1.08, 1.05, 1.11, 1.06, 1.09, 1.05, 1.07, 1.03, 1.06, 1.02, 1],
    opacity: [0.85, 0.92, 0.80, 0.96, 0.72, 0.88, 0.95, 0.78, 0.90, 0.85, 0.93, 0.88, 0.85],
  },
  transition: { duration: 2.0, repeat: Infinity, ease: 'linear' },
};

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
  const [attackAnimating, setAttackAnimating] = useState({});
  const [fleetAnimating, setFleetAnimating] = useState({});
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef(null);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('lastship_volume') ?? '0.7'));
  const explosionAudioRef = useRef(new Audio('/audio/Explosion_Sound_Effect.mp3'));

  useEffect(() => {
    explosionAudioRef.current.volume = volume;
    localStorage.setItem('lastship_volume', String(volume));
  }, [volume]);

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
    const { coordinate, result, sunkShip, shooterSlot } = state.lastShotResult;
    const [r, c] = coordinate;
    const key = `${r},${c}`;
    const cellResult = result === 'sunk' ? 'sunk' : result;
    const isMyShot = shooterSlot === state.playerSlot;

    if (cellResult === 'hit') {
      const audio = new Audio('/audio/Explosion_Sound_Effect.mp3');
      audio.volume = explosionAudioRef.current.volume;
      audio.play().catch(() => {});
    }
    if (cellResult === 'miss') {
      const audio = new Audio('/audio/Explosion_Water_Sound_Effect.mp3');
      audio.volume = explosionAudioRef.current.volume;
      audio.play().catch(() => {});
    }

    if (isMyShot) {
      setAttackAnimating(prev => ({ ...prev, [key]: cellResult }));
      if (canvasRef.current && attackGridRef.current) {
        const gridRect = attackGridRef.current.getBoundingClientRect();
        const gap = 2;
        const cellWidth = (gridRect.width - gap * (GRID_SIZE - 1)) / GRID_SIZE;
        const stride = cellWidth + gap;
        if (sunkShip) {
          const positions = sunkShip.cells.map(([cr, cc]) => ({
            x: gridRect.left + cc * stride + cellWidth / 2,
            y: gridRect.top + cr * stride + cellWidth / 2,
          }));
          triggerExplosion(canvasRef.current, positions);
        } else if (cellResult === 'hit') {
          triggerExplosion(canvasRef.current, [{
            x: gridRect.left + c * stride + cellWidth / 2,
            y: gridRect.top + r * stride + cellWidth / 2,
          }]);
        }
      }
      if (sunkShip) {
        dispatch({ type: 'ADD_SUNK', targetIndex: oppIndex, shipName: sunkShip.name });
        for (const [cr, cc] of sunkShip.cells) {
          setAttackAnimating(prev => ({ ...prev, [`${cr},${cc}`]: 'sunk' }));
        }
      }
    } else {
      setFleetAnimating(prev => ({ ...prev, [key]: cellResult }));
      if (sunkShip) {
        dispatch({ type: 'ADD_SUNK', targetIndex: myIndex, shipName: sunkShip.name });
        for (const [cr, cc] of sunkShip.cells) {
          setFleetAnimating(prev => ({ ...prev, [`${cr},${cc}`]: 'sunk' }));
        }
      }
    }

    dispatch({ type: 'UPDATE_TURN', turn: state.currentTurn === 1 ? 2 : 1 });
  }, [state.lastShotResult]);

  const handleForfeitClick = useCallback(() => {
    if (!confirming) {
      setConfirming(true);
      confirmTimerRef.current = setTimeout(() => setConfirming(false), 4000);
    } else {
      clearTimeout(confirmTimerRef.current);
      sendMsg({ type: 'FORFEIT' });
    }
  }, [confirming, sendMsg]);

  function handleFire(r, c) {
    if (!isMyTurn) return;
    if (attackAnimating[`${r},${c}`]) return;
    sendMsg({ type: 'FIRE', coordinate: [r, c] });
  }

  function getCellState(board, r, c, animating) {
    if (animating[`${r},${c}`]) return animating[`${r},${c}`];
    return board?.[r]?.[c]?.state ?? 'empty';
  }

  return (
    <div className="game-board">
      <canvas ref={canvasRef} className="explosion-canvas" />

      <div className="turn-bar">
        {state.myAvatar && (
          <span className="turn-avatar" style={{ background: state.myAvatar.color }}>{state.myAvatar.icon}</span>
        )}
        <span className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opp-turn'}`}>
          {isMyTurn ? 'Your turn — fire!' : "Opponent's turn"}
        </span>
        {state.opponentAvatar && (
          <span className="turn-avatar" style={{ background: state.opponentAvatar.color }}>{state.opponentAvatar.icon}</span>
        )}
        <CountdownTimer seconds={30} key={state.turnTimerTick} onExpire={() => {}} />
        <div className="volume-control">
          {volume === 0 ? <LuVolumeX /> : <LuVolume2 />}
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
        </div>
        <div className="forfeit-actions">
          {confirming && (
            <button
              className="btn-ghost"
              onClick={() => { clearTimeout(confirmTimerRef.current); setConfirming(false); }}
            >
              Cancel
            </button>
          )}
          <button className={confirming ? 'btn-danger' : 'btn-ghost'} onClick={handleForfeitClick}>
            {confirming ? 'Confirm?' : 'Forfeit'}
          </button>
        </div>
      </div>

      <div className="boards-container">
        <div className="board-section">
          <h3>Your Fleet</h3>
          <ShipHealthBar
            label="Your ships"
            hitsObj={state.shipHits[myIndex]}
            sunkList={state.sunkShips[myIndex] ?? []}
          />
          <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, var(--cell))` }}>

            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const s = getCellState(myBoard, r, c, fleetAnimating);
                return (
                  <motion.div
                    key={`my-${r}-${c}`}
                    className={`grid-cell ${s}`}
                    variants={cellVariants}
                    animate={s}
                  >
                    {s === 'empty' && <LuEqualApproximately className="sea-icon" />}
                    {s === 'ship'  && <FaShip className="ship-cell-icon" />}
                    {s === 'sunk' && <GiHarryPotterSkull className="skull-icon" />}
                    {s === 'hit' && (
                      <motion.div className="fire-ship-icon" {...fireShipAnim}>
                        <SiFireship />
                      </motion.div>
                    )}
                    {s === 'miss' && (
                      <div className="sonar-wrap">
                        <motion.div className="sonar-icon" {...sonarAnim}>
                          <SiSonarqubeserver />
                        </motion.div>
                        <motion.div
                          className="sonar-icon"
                          initial={{ rotate: 90, scale: 0, opacity: 1 }}
                          animate={sonarAnim.animate}
                          transition={sonarAnim.transition}
                        >
                          <SiSonarqubeserver />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
          <AnimatePresence>
            {state.boardEmoji && (
              <motion.div key={state.boardEmoji.id} className="board-emoji"
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                {state.boardEmoji.emoji}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        <div className="board-section">
          <h3>Your Attack</h3>
          <ShipHealthBar
            label="Enemy ships"
            hitsObj={state.shipHits[oppIndex]}
            sunkList={state.sunkShips[oppIndex] ?? []}
          />
          <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className={`grid ${isMyTurn ? 'interactive' : 'locked'}`} ref={attackGridRef} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, var(--cell))` }}>
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const s = getCellState(attackBoard, r, c, attackAnimating);
                const clickable = isMyTurn && s === 'empty';
                return (
                  <motion.div
                    key={`atk-${r}-${c}`}
                    className={`grid-cell ${s} ${clickable ? 'clickable' : ''}`}
                    variants={cellVariants}
                    animate={s}
                    onTap={clickable ? () => handleFire(r, c) : undefined}
                    whileHover={clickable ? { scale: 1.1 } : {}}
                    whileTap={clickable ? { scale: 0.85 } : {}}
                  >
                    {s === 'empty' && <LuEqualApproximately className="sea-icon" />}
                    {s === 'sunk' && <GiHarryPotterSkull className="skull-icon" />}
                    {s === 'hit' && (
                      <motion.div className="fire-ship-icon" {...fireShipAnim}>
                        <SiFireship />
                      </motion.div>
                    )}
                    {s === 'miss' && (
                      <div className="sonar-wrap">
                        <motion.div className="sonar-icon" {...sonarAnim}>
                          <SiSonarqubeserver />
                        </motion.div>
                        <motion.div
                          className="sonar-icon"
                          initial={{ rotate: 90, scale: 0, opacity: 1 }}
                          animate={sonarAnim.animate}
                          transition={sonarAnim.transition}
                        >
                          <SiSonarqubeserver />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
          <AnimatePresence>
          </AnimatePresence>
          </div>
        </div>
      </div>

      {state.gameMode === 'pvp' && <ChatBox />}
    </div>
  );
}
