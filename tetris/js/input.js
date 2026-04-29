import { isGameOver, isPaused, setPaused } from './state.js';
import {
  movePiece, rotatePiece, softDrop, hardDrop,
} from './game.js';

// ─── DAS (Delayed Auto Shift) state ───────────────────────────────
let dasTimer = null;
let arrTimer = null;
const DAS_DELAY = 170; // ms before auto-repeat starts
const ARR_INTERVAL = 50; // ms between auto-repeat moves

// ─── Handle key down ──────────────────────────────────────────────
function onKeyDown(event) {
  if (event.repeat) return;

  const key = event.key;

  if (key === 'p' || key === 'P') {
    setPaused(!isPaused());
    return;
  }

  if (isGameOver() || isPaused()) return;

  switch (key) {
    case 'ArrowLeft':
      event.preventDefault();
      movePiece(-1);
      startDAS('left');
      break;
    case 'ArrowRight':
      event.preventDefault();
      movePiece(1);
      startDAS('right');
      break;
    case 'ArrowDown':
      event.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
      event.preventDefault();
      rotatePiece();
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
  }
}

// ─── Handle key up ────────────────────────────────────────────────
function onKeyUp(event) {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    stopDAS();
  }
}

// ─── DAS (Delayed Auto Shift) ─────────────────────────────────────
function startDAS(dir) {
  stopDAS();
  dasTimer = setTimeout(() => {
    arrTimer = setInterval(() => {
      movePiece(dir === 'left' ? -1 : 1);
    }, ARR_INTERVAL);
  }, DAS_DELAY);
}

function stopDAS() {
  if (dasTimer) { clearTimeout(dasTimer); dasTimer = null; }
  if (arrTimer) { clearInterval(arrTimer); arrTimer = null; }
}

// ─── Init ─────────────────────────────────────────────────────────
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}
