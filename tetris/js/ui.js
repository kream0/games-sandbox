import { SHAPES, PIECE_COLORS } from './constants.js';

// ─── DOM Refs ─────────────────────────────────────────────────────
export const scoreEl = document.getElementById('score');
export const levelEl = document.getElementById('level');
export const linesEl = document.getElementById('lines');
export const nextCanvas = document.getElementById('next-canvas');

// ─── Update displays ─────────────────────────────────────────────
export function updateScore(v) { if (scoreEl) scoreEl.textContent = v; }
export function updateLevel(v) { if (levelEl) levelEl.textContent = v; }
export function updateLines(v) { if (linesEl) linesEl.textContent = v; }

// ─── Next piece preview (canvas) ──────────────────────────────────
export function updateNextPiece(type) {
  if (!nextCanvas) return;
  const ctx = nextCanvas.getContext('2d');
  const size = 20;
  const gap = 2;
  nextCanvas.width = 120;
  nextCanvas.height = 80;
  ctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!type || !SHAPES[type]) return;

  const shape = SHAPES[type][0]; // first rotation state
  const color = PIECE_COLORS[type];
  const hex = '#' + color.toString(16).padStart(6, '0');

  // Compute bounding box to center the shape
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [r, c] of shape) {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  const pw = (maxC - minC + 1) * (size + gap) - gap;
  const ph = (maxR - minR + 1) * (size + gap) - gap;
  const ox = (nextCanvas.width - pw) / 2;
  const oy = (nextCanvas.height - ph) / 2;

  for (const [r, c] of shape) {
    const x = ox + (c - minC) * (size + gap);
    const y = oy + (r - minR) * (size + gap);
    ctx.fillStyle = hex;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, size, 3);
  }
}

// ─── Game over / pause overlays ───────────────────────────────────
const gameOverEl = document.getElementById('game-over');
const pauseEl = document.getElementById('pause-msg');

export function showGameOver() {
  if (gameOverEl) gameOverEl.classList.add('visible');
}

export function hideGameOver() {
  if (gameOverEl) gameOverEl.classList.remove('visible');
}

export function showPaused() {
  if (pauseEl) pauseEl.classList.add('visible');
}

export function hidePaused() {
  if (pauseEl) pauseEl.classList.remove('visible');
}
