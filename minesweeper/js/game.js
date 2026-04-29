import { GRID_SIZE, MINE_COUNT } from './constants.js';
import {
  board, revealed, flagged,
  timer, flagCount,
  setGameOver, setGameWon, setFirstClick,
  isGameOver,
  resetState,
} from './state.js';
import { forEachNeighbor, countNeighbors } from './grid.js';
import { buildScene, updateCellVisual } from './cells.js';
import { updateMineCount, updateTimer, showMessage, hideMessage } from './ui.js';
import { updateCameraForSize } from './scene.js';

// ─── Timer interval ─────────────────────────────────────────────
let timerIntervalId = null;

// ─── Reveal a cell (flood fill on 0) ─────────────────────────────
export function reveal(r, c) {
  if (!isInBounds(r, c)) return;
  if (revealed[r][c] || flagged[r][c]) return;
  revealed[r][c] = true;

  if (board[r][c] === -1) {
    // Hit a mine — game over
    setGameOver(true);
    stopTimer();
    showMessage('💥 GAME OVER', 'lose');
    revealAllMines();
    updateCellVisual(r, c);
    return;
  }

  updateCellVisual(r, c);

  if (board[r][c] === 0) {
    // Iterative flood fill (avoids stack overflow on large boards)
    const stack = [];
    forEachNeighbor(r, c, (nr, nc) => { stack.push([nr, nc]); });
    while (stack.length > 0) {
      const [cr, cc] = stack.pop();
      if (!isInBounds(cr, cc)) continue;
      if (revealed[cr][cc] || flagged[cr][cc]) continue;
      revealed[cr][cc] = true;
      updateCellVisual(cr, cc);
      if (board[cr][cc] === 0) {
        forEachNeighbor(cr, cc, (nr, nc) => { stack.push([nr, nc]); });
      }
    }
  }

  // Check win once after all reveals
  checkWin();
}

// ─── Chording: reveal neighbors of a number if flag count matches ─
export function chord(r, c) {
  if (!revealed[r][c]) return false;
  const val = board[r][c];
  if (val <= 0) return false;
  const nearbyFlags = countNeighbors(r, c, (nr, nc) => flagged[nr][nc]);
  if (nearbyFlags !== val) return false;

  forEachNeighbor(r, c, (nr, nc) => {
    if (!revealed[nr][nc] && !flagged[nr][nc]) {
      reveal(nr, nc);
    }
  });
  return true;
}

// ─── Toggle flag ─────────────────────────────────────────────────
export function toggleFlag(r, c) {
  if (revealed[r][c]) return;
  if (isGameOver()) return;
  flagged[r][c] = !flagged[r][c];
  flagCount.value += flagged[r][c] ? 1 : -1;
  updateMineCount();
  updateCellVisual(r, c);
}

// ─── Check win condition ─────────────────────────────────────────
function checkWin() {
  let totalRevealed = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (revealed[r][c]) totalRevealed++;
    }
  }
  if (totalRevealed === GRID_SIZE * GRID_SIZE - MINE_COUNT) {
    setGameWon(true);
    setGameOver(true);
    stopTimer();
    showMessage('🎉 YOU WIN!', 'win');
    // Auto-flag remaining mines
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === -1 && !flagged[r][c]) {
          flagged[r][c] = true;
          flagCount.value++;
          updateCellVisual(r, c);
        }
      }
    }
    updateMineCount();
  }
}

// ─── Reveal all mines on loss ────────────────────────────────────
function revealAllMines() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === -1) {
        revealed[r][c] = true;
        updateCellVisual(r, c);
      }
    }
  }
}

// ─── Start / Stop Timer ──────────────────────────────────────────
export function startTimer() {
  timer.value = 0;
  updateTimer(0);
  timerIntervalId = setInterval(() => {
    timer.value++;
    updateTimer(timer.value);
  }, 1000);
}

export function stopTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

// ─── Restart game ────────────────────────────────────────────────
export function restartGame() {
  stopTimer();
  hideMessage();
  setGameOver(false);
  setGameWon(false);
  setFirstClick(true);
  flagCount.value = 0;
  timer.value = 0;
  updateTimer(0);
  updateMineCount();

  resetState();
  buildScene();
  updateCameraForSize();

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      updateCellVisual(r, c);
    }
  }
}

// ─── Helper ──────────────────────────────────────────────────────
function isInBounds(r, c) {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}
