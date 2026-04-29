import { GRID_SIZE } from './constants.js';

// ─── Core State ─────────────────────────────────────────────────
export const board = [];
export const revealed = [];
export const flagged = [];

// Private booleans (need setter/getter to share across modules)
let _gameOver = false;
let _gameWon = false;
let _firstClick = true;

// Mutable-by-reference counters
export const timer = { value: 0 };
export const flagCount = { value: 0 };

export function setGameOver(v) { _gameOver = v; }
export function setGameWon(v) { _gameWon = v; }
export function setFirstClick(v) { _firstClick = v; }
export function isGameOver() { return _gameOver; }
export function isGameWon() { return _gameWon; }
export function isFirstClick() { return _firstClick; }

// ─── Reset for New Game ────────────────────────────────────────
export function resetState() {
  board.length = 0;
  revealed.length = 0;
  flagged.length = 0;
  _gameOver = false;
  _gameWon = false;
  _firstClick = true;
  timer.value = 0;
  flagCount.value = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    board[r] = [];
    revealed[r] = [];
    flagged[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = 0;
      revealed[r][c] = false;
      flagged[r][c] = false;
    }
  }
}
