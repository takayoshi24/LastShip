import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';
import { shipCells, isInBounds } from './gameLogic.js';

function isShot(board, row, col) {
  const state = board[row][col].state;
  return state === 'hit' || state === 'miss' || state === 'sunk';
}

function getUntried(board) {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!isShot(board, r, c)) cells.push([r, c]);
    }
  }
  return cells;
}

function getHitClusters(board) {
  const hits = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].state === 'hit') hits.push([r, c]);
    }
  }
  return hits;
}

function huntCandidates(board, hits) {
  const candidates = new Set();
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  if (hits.length >= 2) {
    const rows = hits.map(([r]) => r);
    const cols = hits.map(([, c]) => c);
    const sameRow = new Set(rows).size === 1;
    const sameCol = new Set(cols).size === 1;

    if (sameRow) {
      const row = rows[0];
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);
      if (minCol > 0 && !isShot(board, row, minCol - 1)) candidates.add(`${row},${minCol - 1}`);
      if (maxCol < GRID_SIZE - 1 && !isShot(board, row, maxCol + 1)) candidates.add(`${row},${maxCol + 1}`);
      return [...candidates].map(k => k.split(',').map(Number));
    }

    if (sameCol) {
      const col = cols[0];
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      if (minRow > 0 && !isShot(board, minRow - 1, col)) candidates.add(`${minRow - 1},${col}`);
      if (maxRow < GRID_SIZE - 1 && !isShot(board, maxRow + 1, col)) candidates.add(`${maxRow + 1},${col}`);
      return [...candidates].map(k => k.split(',').map(Number));
    }
  }

  for (const [hr, hc] of hits) {
    for (const [dr, dc] of dirs) {
      const nr = hr + dr;
      const nc = hc + dc;
      if (isInBounds(nr, nc) && !isShot(board, nr, nc)) {
        candidates.add(`${nr},${nc}`);
      }
    }
  }

  return [...candidates].map(k => k.split(',').map(Number));
}

function probabilityDensity(board, remainingSizes, parityStep = 1) {
  const density = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));

  for (const size of remainingSizes) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c <= GRID_SIZE - size; c++) {
        const cells = shipCells([r, c], 'H', size);
        if (cells.every(([cr, cc]) => !isShot(board, cr, cc))) {
          for (const [cr, cc] of cells) density[cr][cc]++;
        }
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r <= GRID_SIZE - size; r++) {
        const cells = shipCells([r, c], 'V', size);
        if (cells.every(([cr, cc]) => !isShot(board, cr, cc))) {
          for (const [cr, cc] of cells) density[cr][cc]++;
        }
      }
    }
  }

  let best = null;
  let bestScore = -1;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!isShot(board, r, c) && density[r][c] > bestScore) {
        // parity filter: only consider cells on the checkerboard stride
        if ((r + c) % parityStep !== 0) continue;
        bestScore = density[r][c];
        best = [r, c];
      }
    }
  }
  return best;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// easy       — pure random, no targeting
// medium     — hunt/target after hits, random search
// hard       — hunt/target after hits, probability-density search
// superhard  — hard + checkerboard parity filter (fires only at cells spaced by
//              the smallest remaining ship size, dramatically shrinking search space)
// impossible — cheats: reads ship positions directly, never misses
export function getNextShot(board, sunkShipNames, difficulty = 'medium') {
  if (difficulty === 'impossible') {
    const shipCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c].state === 'ship') shipCells.push([r, c]);
      }
    }
    return randomChoice(shipCells);
  }

  const untried = getUntried(board);

  if (difficulty === 'easy') {
    return randomChoice(untried);
  }

  const hits = getHitClusters(board);

  if (hits.length > 0) {
    const candidates = huntCandidates(board, hits);
    if (candidates.length > 0) return randomChoice(candidates);
  }

  if (difficulty === 'hard' || difficulty === 'superhard') {
    const remainingSizes = FLEET_CONFIG
      .filter(s => !sunkShipNames.includes(s.name))
      .map(s => s.size);

    if (difficulty === 'superhard') {
      const minSize = Math.min(...remainingSizes);
      // parity step = min ship size: guarantees every remaining ship is reachable
      // while skipping cells that provably can't be isolated ship cells
      const best = probabilityDensity(board, remainingSizes, minSize);
      if (best) return best;
      // fall back to unfiltered density if parity grid is exhausted
    }

    const densityTarget = probabilityDensity(board, remainingSizes);
    if (densityTarget) return densityTarget;
  }

  return randomChoice(untried);
}
