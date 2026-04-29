import {
  COLS, ROWS, HIDDEN_ROWS,
  SHAPES, WALL_KICKS, I_WALL_KICKS,
  BASE_DROP_INTERVAL, LINE_SCORES, LINES_PER_LEVEL,
} from './constants.js';
import {
  board, currentPiece,
  score, level, lines,
  setGameOver, isGameOver,
  randomPieceType,
  getCurrentCells,
} from './state.js';
import { syncBoard, triggerShake, emitLineClearParticles, flashBlocksAt, disposeEffects, emitShatterBlocks, emitShockwave, triggerBackgroundFlash, emitGlowHalo } from './renderer.js';
import { updateScore, updateLevel, updateLines, updateNextPiece } from './ui.js';
import { playDrop, playHardDrop, playRotate, playLineClear, playGameOver, playLevelUp, playLockSizzle } from './audio.js';

// ─── Next piece cache ─────────────────────────────────────────────
let _nextType = null;

export function getNextType() {
  return _nextType;
}

// ─── Collision test ──────────────────────────────────────────────
function collides(type, rotation, px, py) {
  const shape = SHAPES[type][rotation];
  for (const [r, c] of shape) {
    const row = py + r;
    const col = px + c;
    if (col < 0 || col >= COLS) return true;
    if (row >= ROWS + HIDDEN_ROWS) return true;
    if (row < 0) continue; // above board, still valid
    if (board[row][col] !== 0) return true;
  }
  return false;
}

// ─── Spawn a new piece ───────────────────────────────────────────
export function spawnPiece() {
  if (isGameOver()) return false;

  const type = _nextType || randomPieceType();
  _nextType = randomPieceType();
  updateNextPiece(_nextType);

  const startX = Math.floor((COLS - 2) / 2);
  const startY = 0;

  if (collides(type, 0, startX, startY)) {
    setGameOver(true);
    syncBoard();
    playGameOver();
    return false;
  }

  currentPiece.type = type;
  currentPiece.rotation = 0;
  currentPiece.x = startX;
  currentPiece.y = startY;
  syncBoard();
  return true;
}

// ─── Initial spawn for new game ──────────────────────────────────
export function startGame() {
  _nextType = randomPieceType();
  return spawnPiece();
}

// ─── Move piece left/right ──────────────────────────────────────
export function movePiece(dx) {
  if (isGameOver() || !currentPiece.type) return false;
  if (!collides(currentPiece.type, currentPiece.rotation, currentPiece.x + dx, currentPiece.y)) {
    currentPiece.x += dx;
    syncBoard();
    return true;
  }
  return false;
}

// ─── Rotate piece ────────────────────────────────────────────────
export function rotatePiece() {
  if (isGameOver() || !currentPiece.type) return false;
  const type = currentPiece.type;
  const oldRot = currentPiece.rotation;
  const newRot = (oldRot + 1) % 4;

  // Try basic rotation
  if (!collides(type, newRot, currentPiece.x, currentPiece.y)) {
    currentPiece.rotation = newRot;
    syncBoard();
    playRotate();
    return true;
  }

  // Try wall kicks
  const kickTable = type === 'I' ? I_WALL_KICKS : WALL_KICKS;
  const key = `${oldRot}>${newRot}`;
  const kicks = kickTable[key];
  if (kicks) {
    for (const [dx, dy] of kicks) {
      if (!collides(type, newRot, currentPiece.x + dx, currentPiece.y - dy)) {
        currentPiece.rotation = newRot;
        currentPiece.x += dx;
        currentPiece.y -= dy;
        syncBoard();
        playRotate();
        return true;
      }
    }
  }
  return false;
}

// ─── Hard drop ────────────────────────────────────────────────────
export function hardDrop() {
  if (isGameOver() || !currentPiece.type) return false;
  let dropDist = 0;
  while (!collides(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y + dropDist + 1)) {
    dropDist++;
  }
  currentPiece.y += dropDist;
  lockPiece(true);
  playHardDrop();
  triggerShake(0.15, 0.2);
  return true;
}

// ─── Get ghost piece Y position (for preview) ───────────────────
export function getGhostY() {
  if (!currentPiece.type) return currentPiece.y;
  let gy = currentPiece.y;
  while (!collides(currentPiece.type, currentPiece.rotation, currentPiece.x, gy + 1)) {
    gy++;
  }
  return gy;
}

// ─── Soft drop one row ───────────────────────────────────────────
export function softDrop() {
  if (isGameOver() || !currentPiece.type) return false;
  if (!collides(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
    syncBoard();
    playDrop();
    return true;
  }
  return false;
}

// ─── Lock piece into board ───────────────────────────────────────
function lockPiece(hard = false) {
  if (!currentPiece.type) return;
  const cells = getCurrentCells();
  for (const [r, c] of cells) {
    if (r >= 0 && r < ROWS + HIDDEN_ROWS && c >= 0 && c < COLS) {
      board[r][c] = currentPiece.type;
    }
  }
  currentPiece.type = null;

  if (!hard) playDrop();
  playLockSizzle();

  const cleared = clearLines();

  if (cleared > 0) {
    triggerShake(0.1 + cleared * 0.1, 0.2 + cleared * 0.1);
  }

  if (!isGameOver()) {
    spawnPiece();
  }
  syncBoard();
}

// ─── Tick (called by game loop timer) ────────────────────────────
export function tick() {
  if (isGameOver() || !currentPiece.type) return;
  if (collides(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    lockPiece(false);
  } else {
    currentPiece.y++;
    syncBoard();
  }
}

// ─── Clear completed lines ───────────────────────────────────────
function clearLines() {
  // Pass 1: detect full rows BEFORE shifting (so effects can use current board state)
  const fullRows = [];
  for (let r = ROWS + HIDDEN_ROWS - 1; r >= HIDDEN_ROWS; r--) {
    if (board[r].every(c => c !== 0)) {
      fullRows.push(r);
    }
  }

  let cleared = fullRows.length;

  if (cleared > 0) {
    // Trigger ALL visual effects on the current board state (blocks still visible)
    flashBlocksAt(fullRows, 0.25);
    emitShatterBlocks(fullRows);
    emitLineClearParticles(fullRows);
    emitShockwave(0, cleared);
    triggerBackgroundFlash(0.1 + cleared * 0.08);
    emitGlowHalo(fullRows);

    // Scoring
    lines.value += cleared;
    score.value += LINE_SCORES[Math.min(cleared, 4)] * level.value;
    const newLevel = Math.floor(lines.value / LINES_PER_LEVEL) + 1;
    const leveledUp = newLevel > level.value;
    level.value = newLevel;

    updateScore(score.value);
    updateLines(lines.value);
    updateLevel(level.value);

    // Audio
    playLineClear(cleared);

    if (leveledUp) {
      playLevelUp();
    }

    // Pass 2: actually clear the rows (blocks vanish, rows shift down)
    const sorted = [...fullRows].sort((a, b) => a - b);
    for (const r of sorted) {
      for (let r2 = r; r2 > 0; r2--) {
        for (let c = 0; c < COLS; c++) {
          board[r2][c] = board[r2 - 1][c];
        }
      }
      board[0].fill(0);
    }
  }

  return cleared;
}

// ─── Calculate drop interval for current level ───────────────────
export function getDropInterval() {
  return Math.max(50, BASE_DROP_INTERVAL - (level.value - 1) * 60);
}
