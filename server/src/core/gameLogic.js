import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';

export function createBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ state: 'empty', shipName: null }))
  );
}

export function shipCells(origin, orientation, size) {
  const [row, col] = origin;
  return Array.from({ length: size }, (_, i) =>
    orientation === 'H' ? [row, col + i] : [row + i, col]
  );
}

export function isInBounds(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

export function validatePlacements(placements) {
  const occupied = new Set();

  for (const { shipName, origin, orientation } of placements) {
    const config = FLEET_CONFIG.find(s => s.name === shipName);
    if (!config) return { valid: false, reason: `Unknown ship: ${shipName}` };

    const cells = shipCells(origin, orientation, config.size);

    for (const [r, c] of cells) {
      if (!isInBounds(r, c)) return { valid: false, reason: `${shipName} is out of bounds` };
      const key = `${r},${c}`;
      if (occupied.has(key)) return { valid: false, reason: `${shipName} overlaps another ship` };
      occupied.add(key);
    }
  }

  return { valid: true };
}

export function applyPlacements(board, placements) {
  const next = board.map(row => row.map(cell => ({ ...cell })));
  for (const { shipName, origin, orientation } of placements) {
    const config = FLEET_CONFIG.find(s => s.name === shipName);
    for (const [r, c] of shipCells(origin, orientation, config.size)) {
      next[r][c] = { state: 'ship', shipName };
    }
  }
  return next;
}

export function randomPlacement(existingPlacements = [], rand = Math.random) {
  const placed = [...existingPlacements];
  const occupied = new Set();

  for (const { shipName, origin, orientation } of placed) {
    const config = FLEET_CONFIG.find(s => s.name === shipName);
    for (const [r, c] of shipCells(origin, orientation, config.size)) {
      occupied.add(`${r},${c}`);
    }
  }

  const placedNames = new Set(placed.map(p => p.shipName));
  const remaining = FLEET_CONFIG.filter(s => !placedNames.has(s.name));

  for (const ship of remaining) {
    let attempts = 0;
    while (attempts < 1000) {
      attempts++;
      const orientation = rand() < 0.5 ? 'H' : 'V';
      const maxRow = orientation === 'V' ? GRID_SIZE - ship.size : GRID_SIZE - 1;
      const maxCol = orientation === 'H' ? GRID_SIZE - ship.size : GRID_SIZE - 1;
      const row = Math.floor(rand() * (maxRow + 1));
      const col = Math.floor(rand() * (maxCol + 1));
      const cells = shipCells([row, col], orientation, ship.size);

      if (cells.every(([r, c]) => !occupied.has(`${r},${c}`))) {
        for (const [r, c] of cells) occupied.add(`${r},${c}`);
        placed.push({ shipName: ship.name, origin: [row, col], orientation });
        break;
      }
    }
  }

  return placed;
}

export function processShot(board, placements, coordinate) {
  const [row, col] = coordinate;

  if (!isInBounds(row, col)) return { error: 'OUT_OF_BOUNDS' };

  const cell = board[row][col];
  if (cell.state === 'hit' || cell.state === 'miss') return { error: 'ALREADY_SHOT' };

  const next = board.map(r => r.map(c => ({ ...c })));
  const result = cell.state === 'ship' ? 'hit' : 'miss';
  next[row][col] = { ...cell, state: result };

  let sunkShip = null;
  if (result === 'hit') {
    const shipName = cell.shipName;
    const config = FLEET_CONFIG.find(s => s.name === shipName);
    const placement = placements.find(p => p.shipName === shipName);

    if (placement) {
      const cells = shipCells(placement.origin, placement.orientation, config.size);
      const isSunk = cells.every(([r, c]) => {
        if (r === row && c === col) return true;
        return next[r][c].state === 'hit';
      });

      if (isSunk) {
        sunkShip = { name: shipName, cells };
        for (const [r, c] of cells) {
          next[r][c] = { ...next[r][c], state: 'sunk' };
        }
      }
    }
  }

  return { board: next, result, sunkShip };
}

export function checkWin(board, placements) {
  return placements.every(({ shipName, origin, orientation }) => {
    const config = FLEET_CONFIG.find(s => s.name === shipName);
    return shipCells(origin, orientation, config.size).every(([r, c]) =>
      board[r][c].state === 'hit' || board[r][c].state === 'sunk'
    );
  });
}
