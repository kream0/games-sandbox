import { MINE_COUNT } from './constants.js';
import { timer, flagCount } from './state.js';

// ─── DOM Refs ────────────────────────────────────────────────────
export const mineCountEl = document.getElementById('mine-count');
export const timerEl = document.getElementById('timer');
export const messageEl = document.getElementById('message');
export const restartBtn = document.getElementById('restart-btn');
export const difficultySelect = document.getElementById('difficulty');

// ─── Update mine counter ─────────────────────────────────────────
export function updateMineCount() {
  mineCountEl.textContent = Math.max(0, MINE_COUNT - flagCount.value);
}

// ─── Timer ───────────────────────────────────────────────────────
export function updateTimer(value) {
  timerEl.textContent = value;
}

// ─── Message ─────────────────────────────────────────────────────
export function showMessage(text, cls) {
  messageEl.textContent = text;
  messageEl.className = 'show ' + cls;
}

export function hideMessage() {
  messageEl.className = '';
  messageEl.textContent = '';
}
