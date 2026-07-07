import { GRID_SIZE } from '../config/fleet.js';

const COLS = 'ABCDEFGHIJ'.slice(0, GRID_SIZE).split('');
const ROWS = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);

export default function LabeledGrid({ children, gridRef, gridClass = '', gridStyle }) {
  return (
    <div className="lg-wrap">
      <div className="lg-col-headers">
        <span className="lg-corner" />
        {COLS.map(c => <span key={c} className="lg-col-lbl">{c}</span>)}
      </div>
      <div className="lg-body">
        <div className="lg-row-labels">
          {ROWS.map(n => <span key={n} className="lg-row-lbl">{n}</span>)}
        </div>
        <div ref={gridRef} className={`grid ${gridClass}`} style={gridStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
