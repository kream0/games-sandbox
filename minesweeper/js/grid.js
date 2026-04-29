import { GRID_SIZE, MINE_COUNT } from './constants.js';
import { board } from './state.js';

// ─── Check bounds ────────────────────────────────────────────────
export function isInBounds(r, c) {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

// ─── Iterate all 8 neighbors ─────────────────────────────────────
export function forEachNeighbor(r, c, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (isInBounds(nr, nc)) fn(nr, nc);
    }
  }
}

// ─── Count neighbors matching a predicate ────────────────────────
export function countNeighbors(r, c, predicate) {
  let count = 0;
  forEachNeighbor(r, c, (nr, nc) => {
    if (predicate(nr, nc)) count++;
  });
  return count;
}

// ─── Initialize empty board ──────────────────────────────────────
export function initBoard() {
  for (let r = 0; r < GRID_SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = 0;
    }
  }
}

// ─── Place mines after first click ───────────────────────────────
export function placeMines(safeRow, safeCol) {
  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (board[r][c] === -1) continue;
    // Keep first click and its neighbors safe
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    board[r][c] = -1;
    placed++;
  }

  // Compute proximity numbers
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === -1) continue;
      board[r][c] = countNeighbors(r, c, (nr, nc) => board[nr][nc] === -1);
    }
  }
}
