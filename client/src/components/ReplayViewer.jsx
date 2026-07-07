import { useState, useEffect, useRef } from 'react';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';

function buildBoards(placements, shots, step) {
  const blank = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty'));
  const boards = [blank(), blank()];

  for (let pi = 0; pi < 2; pi++) {
    for (const { shipName, origin, orientation } of (placements[pi] ?? [])) {
      const size = FLEET_CONFIG.find(s => s.name === shipName)?.size ?? 0;
      for (let i = 0; i < size; i++) {
        const r = orientation === 'H' ? origin[0] : origin[0] + i;
        const c = orientation === 'H' ? origin[1] + i : origin[1];
        boards[pi][r][c] = 'ship';
      }
    }
  }

  for (let i = 0; i < step; i++) {
    const { shooter, coordinate, result, sunkCells } = shots[i];
    const targetIdx = shooter === 1 ? 1 : 0;
    const [r, c] = coordinate;
    if (sunkCells) {
      for (const [sr, sc] of sunkCells) boards[targetIdx][sr][sc] = 'sunk';
    } else {
      boards[targetIdx][r][c] = result;
    }
  }

  return boards;
}

const COL_LABELS = 'ABCDEFGHIJ'.split('');

function MiniGrid({ board, highlightCell }) {
  return (
    <div className="replay-grid">
      <div className="replay-col-labels">
        <span />
        {COL_LABELS.map(l => <span key={l}>{l}</span>)}
      </div>
      {board.map((row, r) => (
        <div key={r} className="replay-row">
          <span className="replay-row-label">{r + 1}</span>
          {row.map((state, c) => {
            const isHighlight = highlightCell && highlightCell[0] === r && highlightCell[1] === c;
            return (
              <span key={c} className={`replay-cell ${state} ${isHighlight ? 'highlight' : ''}`} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function ReplayViewer({ data, onClose }) {
  const { shots, placements } = data;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= shots.length) { setPlaying(false); return s; }
          return s + 1;
        });
      }, 800);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, shots.length]);

  const boards = buildBoards(placements, shots, step);
  const currentShot = step > 0 ? shots[step - 1] : null;
  const targetIdx = currentShot ? (currentShot.shooter === 1 ? 1 : 0) : null;
  const highlight0 = currentShot && targetIdx === 0 ? currentShot.coordinate : null;
  const highlight1 = currentShot && targetIdx === 1 ? currentShot.coordinate : null;

  function stepLabel() {
    if (!currentShot) return 'Start of game';
    const [r, c] = currentShot.coordinate;
    const coord = `${COL_LABELS[c]}${r + 1}`;
    const what = currentShot.sunkCells ? `Sunk!` : currentShot.result === 'hit' ? 'Hit' : 'Miss';
    return `Shot ${step}/${shots.length} — Player ${currentShot.shooter} → ${coord} (${what})`;
  }

  return (
    <div className="replay-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="replay-modal">
        <div className="replay-header">
          <h2>Game Replay</h2>
          <button className="replay-close" onClick={onClose}>✕</button>
        </div>

        <div className="replay-step-label">{stepLabel()}</div>

        <div className="replay-boards">
          <div className="replay-board-wrap">
            <h4>Player 1 Fleet</h4>
            <MiniGrid board={boards[0]} highlightCell={highlight0} />
          </div>
          <div className="replay-board-wrap">
            <h4>Player 2 Fleet</h4>
            <MiniGrid board={boards[1]} highlightCell={highlight1} />
          </div>
        </div>

        <div className="replay-controls">
          <button className="btn-secondary" onClick={() => { setPlaying(false); setStep(0); }}>⏮</button>
          <button className="btn-secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>◀</button>
          <button className="btn-primary" onClick={() => setPlaying(p => !p)}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="btn-secondary" onClick={() => setStep(s => Math.min(shots.length, s + 1))} disabled={step >= shots.length}>▶</button>
          <button className="btn-secondary" onClick={() => { setPlaying(false); setStep(shots.length); }}>⏭</button>
        </div>

        <div className="replay-progress">
          <input
            type="range" min={0} max={shots.length} value={step}
            onChange={e => { setPlaying(false); setStep(Number(e.target.value)); }}
          />
          <span>{step} / {shots.length}</span>
        </div>
      </div>
    </div>
  );
}
