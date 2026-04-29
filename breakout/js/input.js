import { isGameOver, isPaused, setPaused, ball } from './state.js';
import { movePaddle, launchBall } from './game.js';
import { renderer } from './renderer.js';
import { COLS, BRICK_WIDTH, GAP } from './constants.js';

// ─── Mouse / pointer tracking ─────────────────────────────────────
export function initInput() {
  let isPointerDown = false;

  const onPointerMove = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const worldX = x * ((COLS * (BRICK_WIDTH + GAP) - GAP) / 2 + 0.5);
    movePaddle(worldX);
  };

  const onPointerDown = () => {
    isPointerDown = true;
    if (!ball.active) launchBall();
  };
  const onPointerUp = () => { isPointerDown = false; };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  // ─── Keyboard ────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      if (!isGameOver()) setPaused(!isPaused());
    }
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (!ball.active) launchBall();
    }
    if ((e.key === 'r' || e.key === 'R') && isGameOver()) {
      window.dispatchEvent(new CustomEvent('restart'));
    }
  });
}
