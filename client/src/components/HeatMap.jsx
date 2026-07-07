import { GRID_SIZE } from '../config/fleet.js';

const COLS = 'ABCDEFGHIJ'.slice(0, GRID_SIZE).split('');
const ROWS = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);

function Grid({ title, shots, accuracy }) {
  const cells = {};
  for (const { coordinate, result } of shots) {
    const [r, c] = coordinate;
    cells[`${r},${c}`] = result === 'sunk' ? 'hit' : result;
  }

  return (
    <div className="heatmap-grid-wrap">
      <h3 className="heatmap-title">{title}</h3>
      <div className="heatmap-accuracy">{accuracy}</div>
      <div className="hm-lg-wrap">
        <div className="hm-col-headers">
          <span />
          {COLS.map(c => <span key={c} className="hm-lbl">{c}</span>)}
        </div>
        <div className="hm-body">
          <div className="hm-row-labels">
            {ROWS.map(n => <span key={n} className="hm-lbl">{n}</span>)}
          </div>
          <div className="heatmap-grid">
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const state = cells[`${r},${c}`] ?? 'empty';
                return <div key={`${r},${c}`} className={`hm-cell hm-${state}`} />;
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeatMap({ shots, playerSlot, onClose }) {
  const myShots = shots.filter(s => s.shooter === playerSlot);
  const oppShots = shots.filter(s => s.shooter !== playerSlot);

  function pct(arr) {
    const hits = arr.filter(s => s.result === 'hit' || s.result === 'sunk').length;
    if (!arr.length) return '0 shots';
    return `${hits}/${arr.length} hits (${Math.round((hits / arr.length) * 100)}%)`;
  }

  return (
    <div className="info-backdrop" onClick={onClose}>
      <div className="heatmap-modal" onClick={e => e.stopPropagation()}>
        <div className="info-header">
          <h2>Shot Analysis</h2>
          <button className="info-close" onClick={onClose}>✕</button>
        </div>
        <div className="heatmap-body">
          <Grid title="Your shots" shots={myShots} accuracy={pct(myShots)} />
          <Grid title="Opponent's shots" shots={oppShots} accuracy={pct(oppShots)} />
        </div>
        <div className="heatmap-legend">
          <span className="hm-legend-item"><span className="hm-dot hm-hit" /> Hit</span>
          <span className="hm-legend-item"><span className="hm-dot hm-miss" /> Miss</span>
          <span className="hm-legend-item"><span className="hm-dot hm-empty" /> Not fired</span>
        </div>
      </div>
    </div>
  );
}
