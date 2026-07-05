import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { useGame } from '../context/GameContext.jsx';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';

const PLACEMENT_SECS = 60;

function cellsFor(origin, orientation, size) {
  const [r, c] = origin;
  return Array.from({ length: size }, (_, i) =>
    orientation === 'H' ? [r, c + i] : [r + i, c]
  );
}

function isValid(origin, orientation, size, occupied) {
  const cells = cellsFor(origin, orientation, size);
  return cells.every(([r, c]) => {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    return !occupied.has(`${r},${c}`);
  });
}

function ShipDraggable({ ship, orientation }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ship.name,
    data: { ship, orientation },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`ship-piece orientation-${orientation} ${isDragging ? 'dragging' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: orientation === 'H' ? `repeat(${ship.size}, 36px)` : '36px',
        gridTemplateRows: orientation === 'V' ? `repeat(${ship.size}, 36px)` : '36px',
        cursor: 'grab',
      }}
    >
      {Array.from({ length: ship.size }, (_, i) => (
        <div key={i} className="ship-cell ship-preview-cell" />
      ))}
    </div>
  );
}

function GridCell({ row, col, hasShip, preview }) {
  const { setNodeRef } = useDroppable({ id: `cell-${row}-${col}`, data: { row, col } });

  let cls = 'grid-cell';
  if (hasShip) cls += ' ship';
  if (preview) cls += preview.valid ? ' preview-valid' : ' preview-invalid';

  return <div ref={setNodeRef} className={cls} />;
}

export default function PlacementPhase() {
  const { state, sendMsg, dispatch } = useGame();
  const [placements, setPlacements] = useState([]);
  const [orientation, setOrientation] = useState('H');
  const [dragOver, setDragOver] = useState(null);
  const [secsLeft, setSecsLeft] = useState(PLACEMENT_SECS);
  const [activeId, setActiveId] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const occupied = new Set();
  for (const p of placements) {
    const cfg = FLEET_CONFIG.find(s => s.name === p.shipName);
    for (const [r, c] of cellsFor(p.origin, p.orientation, cfg.size)) {
      occupied.add(`${r},${c}`);
    }
  }

  const placedNames = new Set(placements.map(p => p.shipName));
  const unplaced = FLEET_CONFIG.filter(s => !placedNames.has(s.name));

  function getPreviewCells() {
    if (!dragOver || !activeId) return null;
    const ship = FLEET_CONFIG.find(s => s.name === activeId);
    if (!ship) return null;
    const { row, col } = dragOver;
    const tempOccupied = new Set(occupied);
    const existing = placements.find(p => p.shipName === ship.name);
    if (existing) {
      const cfg = FLEET_CONFIG.find(s => s.name === existing.shipName);
      for (const [r, c] of cellsFor(existing.origin, existing.orientation, cfg.size)) {
        tempOccupied.delete(`${r},${c}`);
      }
    }
    const valid = isValid([row, col], orientation, ship.size, tempOccupied);
    return { cells: new Set(cellsFor([row, col], orientation, ship.size).map(([r, c]) => `${r},${c}`)), valid };
  }

  const preview = getPreviewCells();

  function handleDragEnd({ active, over }) {
    setDragOver(null);
    setActiveId(null);
    if (!over) return;
    const { row, col } = over.data.current;
    const ship = FLEET_CONFIG.find(s => s.name === active.id);
    if (!ship) return;

    const tempOccupied = new Set(occupied);
    const existing = placements.find(p => p.shipName === ship.name);
    if (existing) {
      const cfg = FLEET_CONFIG.find(s => s.name === existing.shipName);
      for (const [r, c] of cellsFor(existing.origin, existing.orientation, cfg.size)) {
        tempOccupied.delete(`${r},${c}`);
      }
    }

    if (!isValid([row, col], orientation, ship.size, tempOccupied)) return;

    setPlacements(prev => [
      ...prev.filter(p => p.shipName !== ship.name),
      { shipName: ship.name, origin: [row, col], orientation },
    ]);
  }

  function handleReady() {
    dispatch({ type: 'UPDATE_PLACEMENTS', placements });
    sendMsg({ type: 'PLACE_SHIPS', placements });
  }

  function handleSkip() {
    sendMsg({ type: 'PLACE_SHIPS', placements: [] });
  }

  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');
  const timerUrgent = secsLeft <= 10;

  return (
    <div className="placement-phase">
      <div className="placement-header">
        <h2>Place your ships</h2>
        <span className={`timer ${timerUrgent ? 'urgent' : ''}`}>{mins}:{secs}</span>
        <button
          onClick={() => setOrientation(o => o === 'H' ? 'V' : 'H')}
          className="btn-ghost"
        >
          Rotate ({orientation})
        </button>
      </div>

      <DndContext
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragOver={({ over }) => setDragOver(over?.data?.current ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setDragOver(null); setActiveId(null); }}
      >
        <div className="placement-body">
          <div className="ship-panel">
            <p>Unplaced ships:</p>
            {unplaced.map(ship => (
              <div key={ship.name} className="ship-row">
                <span className="ship-name">{ship.name} ({ship.size})</span>
                <ShipDraggable ship={ship} orientation={orientation} />
              </div>
            ))}
            {unplaced.length === 0 && <p className="all-placed">All ships placed!</p>}
          </div>

          <div className="grid-wrapper">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 36px)` }}>
              {Array.from({ length: GRID_SIZE }, (_, r) =>
                Array.from({ length: GRID_SIZE }, (_, c) => {
                  const key = `${r},${c}`;
                  const inPreview = preview?.cells.has(key);
                  const hasShip = occupied.has(key);
                  return (
                    <GridCell
                      key={key}
                      row={r}
                      col={c}
                      hasShip={hasShip}
                      preview={inPreview ? { valid: preview.valid } : null}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DndContext>

      <div className="placement-actions">
        {placedNames.size === FLEET_CONFIG.length && (
          <button onClick={handleReady} className="btn-primary">Ready!</button>
        )}
        <button onClick={handleSkip} className="btn-ghost">Auto-place</button>
      </div>

      <p className="placement-hint">
        {placedNames.size}/{FLEET_CONFIG.length} ships placed — drag ships onto the grid, rotate with the button above
      </p>
    </div>
  );
}
