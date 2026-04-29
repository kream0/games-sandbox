import {
  COLS, ROWS,
  BRICK_COLORS, BALL_SPEED,
} from './constants.js';

// ─── Game state ───────────────────────────────────────────────────
export const bricks = []; // 2D array [row][col] — true = alive
export let paddleX = 0;
export let ball = { x: 0, y: -3, vx: 0, vy: 0, active: false };
export let score = { value: 0 };
export let lives = { value: 3 };
export let _gameOver = false;
export let _paused = false;
export let combo = { value: 0 };

// ─── Setters ──────────────────────────────────────────────────────
export function setPaddleX(v) { paddleX = v; }
export function setBall(b) { ball = b; }
export function setGameOver(v) { _gameOver = v; }
export function isGameOver() { return _gameOver; }
export function setPaused(v) { _paused = v; }
export function isPaused() { return _paused; }
export function setCombo(v) { combo.value = v; }

// ─── Init bricks ──────────────────────────────────────────────────
export function initBricks() {
  bricks.length = 0;
  for (let r = 0; r < ROWS; r++) {
    bricks[r] = [];
    for (let c = 0; c < COLS; c++) {
      bricks[r][c] = true;
    }
  }
}

// ─── Reset ball ───────────────────────────────────────────────────
export function resetBall() {
  ball.x = 0;
  ball.y = -3;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = false;
  combo.value = 0;
}

// ─── Count remaining bricks ───────────────────────────────────────
export function countBricks() {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (bricks[r][c]) n++;
    }
  }
  return n;
}

// ─── Full state reset ─────────────────────────────────────────────
export function resetState() {
  initBricks();
  paddleX = 0;
  resetBall();
  score.value = 0;
  lives.value = 3;
  _gameOver = false;
  _paused = false;
  combo.value = 0;
}
