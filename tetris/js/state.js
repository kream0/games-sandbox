import { COLS, ROWS, HIDDEN_ROWS, PIECE_TYPES, SHAPES } from './constants.js';

// ─── Board: 0 = empty, otherwise piece type char ─────────────────
export const board = [];

// ─── Current piece state ──────────────────────────────────────────
export const currentPiece = {
  type: null,   // 'I', 'O', 'T', etc.
  rotation: 0,  // 0-3
  x: 0,         // column offset
  y: 0,         // row offset (0 = top of board with hidden rows)
};

// ─── Scalar state ─────────────────────────────────────────────────
export const score = { value: 0 };
export const level = { value: 1 };
export const lines = { value: 0 };

// ─── Flags ────────────────────────────────────────────────────────
let _gameOver = false;
let _paused = false;

export function isGameOver() { return _gameOver; }
export function setGameOver(v) { _gameOver = v; }
export function isPaused() { return _paused; }
export function setPaused(v) { _paused = v; }

// ─── Initialize / Reset board ────────────────────────────────────
export function resetBoard() {
  board.length = 0;
  for (let r = 0; r < ROWS + HIDDEN_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = 0;
    }
  }
}

// ─── Reset full state ────────────────────────────────────────────
export function resetState() {
  resetBoard();
  currentPiece.type = null;
  currentPiece.rotation = 0;
  currentPiece.x = 0;
  currentPiece.y = 0;
  score.value = 0;
  level.value = 1;
  lines.value = 0;
  _gameOver = false;
  _paused = false;
}

// ─── Pick a random piece type ────────────────────────────────────
export function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

// ─── Get current piece cells ─────────────────────────────────────
export function getCurrentCells() {
  if (!currentPiece.type) return [];
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  return shape.map(([r, c]) => [currentPiece.y + r, currentPiece.x + c]);
}
